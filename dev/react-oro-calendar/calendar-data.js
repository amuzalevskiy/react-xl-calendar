var EmitterJS = require('emitterjs');
var moment = require('moment');
var uidCounter = 1;
function Event(start, end, title, group){
    this.uid = uidCounter++;
    this.start = moment(start);
    this.end = moment(end);
    this.title = title;
    this.group = group;
}

function EventGroup(title) {
    this.uid = uidCounter++;
    this.title = title;
}

function EventStore() {
    var data = {};
    var groups = [];
    var enabledGroups = [];
    this.data = data;
    this.addGroup = function(group) {
        groups.push(group);
        data[group.uid] = new MapDayToEventList(this);
    };
    this.enableGroup = function (group) {
        if (enabledGroups.indexOf(group) === -1) {
            enabledGroups.push(group);
        }
    };
    this.disableGroup = function (group) {
        var index = enabledGroups.indexOf(group);
        if (index !== -1) {
            enabledGroups.splice(index, 1);
        }
    };
    this.removeGroup = function(group) {
        if (groups.indexOf(group) !== -1){
            groups.splice(groups.indexOf(group), 1);
        }
        delete data[group.uid];
    };
    this.getGroups = function() {
        return groups.map(function (group) {
            return {
                enabled: groups.indexOf(group) !== -1,
                group: group
            }
        });
    };
    this.addEvent = function(event) {
        var dayMap = data[event.group.uid];
        if (!dayMap) {
            this.addGroup(event.group);
            dayMap = data[event.group.uid];
        }
        dayMap.add(event);
    };
    this.removeEvent = function(event) {
        if (!event.days) {
            return;
        }
        for (var i = 0; i < event.days.length; i++) {
            var dayData = event.days[i];
            var index = dayData.list.indexOf(event);
            if (index !== -1) {
                dayData.list.splice(index, 1);
                this.emit(dayData.date);
            }
        }
    };
    this.sendUpdates = function(event) {
        this.removeEvent(event);
        this.addEvent(event);
    };
    this.getEventForDate = function(day) {
        var dayID = day.toISOString();
        return new DailyEventList(Array.prototype.concat.apply([], enabledGroups.map(function(group) {
            return data[group.uid].days[dayID] || [];
        })));
    };
    this.getEventForDateInterval = function(start, length) {
        var daysData = [];
        var date = start;
        for (var i = 0; i < length; i++) {
            var date = date.clone();
            daysData.push(this.getEventForDate(date));
            date.add(1, 'd');
        }
        return new DateInterval(daysData);
    };

    this.createRandomEvent = function(title, group, dateShift, maxLength) {
        if (dateShift === void 0 || dateShift < 0) {
            dateShift = 7;
        }
        if (maxLength === void 0 || maxLength < 0) {
            maxLength = 16;
        }
        dateShift = Math.random() * dateShift * 2 - dateShift;

        var start = new Date((new Date()).getTime() + dateShift * 24*60*60*1000);
        var end = new Date(start.getTime() + Math.ceil(Math.random()*maxLength)*30*60*1000);

        return new Event(start, end, title, group);
    };
    EmitterJS.apply(this);
}

EventStore.prototype = Object.create(EmitterJS.prototype);

function MapDayToEventList(store) {
    var days = this.days = {};
    this.store = store;
    this.getEventForDate = function(day) {
        var day = days[day.format()] || (days[day.format()] = []);
        if (!day) {
            return days[day.format()] = [];
        }
        return day;
    };
    this.add = function(event) {
        var start = event.start.clone().startOf('day');
        var end = event.start.clone().endOf('day');
        var dayList = event.days = [];
        while(start.isBefore(end)) {
            var eventsArray = this.getEventForDate(start);
            eventsArray.push(event);
            dayList.push({list: eventsArray, date: start.clone()});
            store.emit(start);
            start.add(1, 'd');
        }
    };
}

function DailyEventList(events) {
    this.events = events;
}
DailyEventList.prototype.getAllDayEvents = function () {
    return new EventsList(this.events.filter(function(item) {
        return item.allDay;
    }));
};
DailyEventList.prototype.getNormalEvents = function () {
    return new EventsList(this.events.filter(function(item) {
        return !item.allDay;
    }));
};

function EventsList(events) {
    this.events = events || [];
}
EventsList.prototype.isEmpty = function() {
    return !this.events.length;
};
EventsList.prototype.layout = function(rounding) {
    if (!rounding) {
        // 30 min
        rounding = 30*60*1000;
    }
    function ceilRound(date) {
        return Math.ceil(date.valueOf()/rounding);
    }
    function floorRound(date) {
        return Math.floor(date.valueOf()/rounding);
    }
    var timelines = [];
    this.events.sort(function(a, b){
        var diff = floorRound(a.start) - floorRound(b.start);
        return diff !== 0 ? diff : ceilRound(b.end) - ceilRound(a.end);
    });
    var events = this.events.slice();
    var i;
    while (events.length) {
        var event = events.shift();
        var currentEnd = ceilRound(event.end);
        var timeline = [{
            e: event,
            end: currentEnd,
            start: floorRound(event.start),
            index: 1
        }];
        timelines.push(timeline);
        for (i = 0; i < events.length; i++) {
            event = events[i];
            var start = floorRound(event.start);
            if (start >= currentEnd) {
                var end = ceilRound(event.end);
                timeline.push({
                    e: event,
                    end: end,
                    start: start,
                    index: 1
                });
                events.splice(i, 1);
                i--;
                currentEnd = end;
            }
        }
    }
    var takenIndexes = {};
    for (i = timelines.length - 1; i >= 0; i--) {
        var timeline = timelines[i];
        for (var j = 0; j < timeline.length; j++) {
            var eventData = timeline[j];
            var maxIndex = 0;
            var end = eventData.end;
            for (var k = eventData.start; k < end; k++) {
                 maxIndex = Math.max(takenIndexes[k] || 0, maxIndex);
            }
            maxIndex++;
            eventData.index = maxIndex;
            for (var k = eventData.start; k < end; k++) {
                takenIndexes[k] = maxIndex;
            }

        }
    }
    return timelines;
};

function unique(arr)
{
    var n = {}, r=[];
    for(var i = 0; i < arr.length; i++)
    {
        if (!n[arr[i].uid])
        {
            n[arr[i].uid] = true;
            r.push(arr[i]);
        }
    }
    return r;
};

function DateInterval(daysData) {
    this.perDayEvents = daysData;
};
DateInterval.prototype.getAllDayEvents = function() {
    return new EventsList(unique(Array.prototype.concat.apply([], this.perDayEvents.map(function(events) {
        return events.getAllDayEvents().events;
    }))));
};

module.exports = {
    EventStore: EventStore,
    Event: Event,
    DateInterval: DateInterval,
    EventList: EventsList,
    EventGroup: EventGroup,
    DailyEventList: DailyEventList,
    MapDayToEventList: MapDayToEventList
};
