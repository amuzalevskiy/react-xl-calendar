var React = require('react');
var Color = require('color');
var Promise = require('promise');
var CalendarData = require('./calendar-data');
var dragContext = require('./calendar-data');
var moment = require('moment');
var ReactOroCalendar = {
    Calendar: React.createClass({
        getInitialState: function() {
            var holder = new CalendarData.EventStore();

            var defaultGroup = new CalendarData.EventGroup('default');
            var mainGroup = new CalendarData.EventGroup('main');
            var event;

            holder.enableGroup(defaultGroup);
            holder.enableGroup(mainGroup);

            for (var i = 0; i < 30; i++) {
                event = holder.createRandomEvent('#default-' + i, defaultGroup);
                event.background = '#9A9CFF';
                holder.addEvent(event);
            }
            for (i = 0; i < 30; i++) {
                event = holder.createRandomEvent('#main-' + i, mainGroup);
                event.background = '#51B749';
                holder.addEvent(event);
            }

            for (var i = 0; i < 7; i++) {
                event = holder.createRandomEvent('#default-' + i, defaultGroup, 10, 48*4);
                event.background = '#9A9CFF';
                event.allDay = true;
                holder.addEvent(event);
            }
            for (i = 0; i < 7; i++) {
                event = holder.createRandomEvent('#main-' + i, mainGroup, 10, 48*4)
                event.background = '#51B749';
                event.allDay = true;
                holder.addEvent(event);
            }

            return {
                holder: holder,
                projectionHolder: new CalendarData.EventStore()
            }
        },
        render: function() {
            return <div className="react-oro-calendar">
                <ReactOroCalendar.CalendarList holder={this.state.holder} projectionHolder={this.state.projectionHolder} />
                <ReactOroCalendar.SwitchableView holder={this.state.holder} projectionHolder={this.state.projectionHolder} />
            </div>;
        }
    }),
    CalendarList: React.createClass({
        render: function() {
            return <div>CalendarList{this.props.holder.getGroups().map((groupData) => <div>{groupData.group.title}</div>)}</div>;
        }
    }),
    SwitchableView: React.createClass({
        createAvailableViews: function(){
            return [
                {
                    id: 'Month',
                    name: 'Month',
                    view: ReactOroCalendar.MonthView
                },
                {
                    id: 'Week',
                    name: 'Week',
                    view: ReactOroCalendar.WeekView
                },
                {
                    id: 'Day',
                    name: 'Day',
                    view: ReactOroCalendar.DayView
                },
                {
                    id: 'Agenda',
                    name: 'Agenda',
                    view: ReactOroCalendar.AgendaView
                }
            ];
        },
        getInitialState: function() {
            var availableViews = this.createAvailableViews();
            return {
                availableViews: availableViews,
                selectedMode: availableViews[1]
            };
        },
        selectMode: function (mode) {
            this.setState({
                selectedMode: mode
            });
        },
        render: function() {
            return <div>
                <ReactOroCalendar.Switcher views={this.state.availableViews} selected={this.state.selectedMode} onSelect={this.selectMode}/>
                <this.state.selectedMode.view {...this.props} />
            </div>;
        }
    }),
    Switcher: React.createClass({
        onSelect: function(item) {
            this.props.onSelect(item);
        },
        render: function() {
            return <div className="switcher">{this.props.views.map((item)=>{
                return <a className={'switcher__item' + (item === this.props.selected ? ' switcher__item_selected': '')}
                          key={item.id} onClick={this.onSelect.bind(this, item)}>{item.name}</a>
            })}</div>;
        }
    }),
    MonthView: React.createClass({
        render: function() {
            return <div>
                <div>MonthView</div>
            </div>;
        }
    }),
    WeekView: React.createClass({
        getInitialState: function () {
            var today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            var startOfWeek = moment().startOf('week');
            return {
                startOfWeek: startOfWeek,
                length: this.props.length ? this.props.length : 7
            }
        },
        render: function() {
            var daysRendered = [];
            var start = this.state.startOfWeek.clone();
            var length = this.state.length;
            for (var i = 0; i < length; i++) {
                daysRendered.push(<ReactOroCalendar.DayView {...this.props}
                                                            className="hourly-grid___day"
                                                            style={{
                                                                width: 'calc(100% / ' + length + ')',
                                                                left: 'calc(100% / ' + length + '*' + i + ')'
                                                            }}
                                                            day={start}
                                                            renderHours={false}
                                                            key={i}/>);
                start = start.clone().add(1, 'd');
            }
            return <div className="week-view">
                <ReactOroCalendar.WeekAllDayView {...this.props} />
                <ReactOroCalendar.HourLine />
                <div className="hourly-grid">
                    {daysRendered}
                </div>
            </div>;
        }
    }),
    WeekAllDayView: React.createClass({
        getInitialState: function () {
            var today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            var startOfWeek = moment().startOf('week');
            return {
                startOfWeek: startOfWeek,
                length: this.props.length ? this.props.length : 7
            }
        },
        render: function() {
            var dateInterval = this.props.holder.getEventForDateInterval(this.state.startOfWeek, this.state.length);
            var layout = dateInterval.getAllDayEvents().layout(24*60*60*1000);

            return <div className="horizontal-events-line-wrapper">
                {layout.map((line)=> (
                    <div className="horizontal-events-line">{line.map((eventData)=> {
                        var relativeStart = Math.floor(eventData.e.start.diff(this.state.startOfWeek) / (24*60*60*1000));
                        var relativeEnd = Math.ceil(eventData.e.end.diff(this.state.startOfWeek) / (24*60*60*1000));
                        return <div className="horizontal-event" style={{
                            background: eventData.e.background,
                            borderColor: Color(eventData.e.background).darken(0.6).rgbString(),
                            color: Color(eventData.e.background).light() ? 'black' : 'white',
                            display: eventData.e.visible !== false ? 'block' : 'none',
                            width: 'calc(100% / ' + this.state.length + ' * ' + (relativeEnd - relativeStart)+ ' - 4px)',
                            left: 'calc(100% / ' + this.state.length + ' * ' + relativeStart + ' + 2px)'
                        }}>{eventData.e.title}</div>
                    })}</div>))}
            </div>;
        }
    }),
    DayView: React.createClass({
        getInitialState: function () {
            var today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            var _this = this;
            return {
                renderHours: this.props.renderHours !== false,
                currentDay: this.props.day ? this.props.day : today,
                cb: function () {
                    console.log(_this.state.currentDay);
                    _this.forceUpdate();
                }
            }
        },
        componentDidMount: function () {
            this.props.holder.on(this.state.currentDay, this.state.cb);
            this.props.projectionHolder.on(this.state.currentDay, this.state.cb);
        },
        componentWillUnmount: function () {
            this.props.holder.off(this.state.currentDay, this.state.cb);
            this.props.projectionHolder.off(this.state.currentDay, this.state.cb);
        },
        renderEvent: function (eventData, eventLineIndex, left, width) {
            var event = eventData.e;
            var relativeStart = Math.floor(event.start.diff(this.state.currentDay) / (30*60*1000)) / 2;
            var relativeEnd = Math.ceil(event.end.diff(this.state.currentDay) / (30*60*1000)) / 2;
            if (relativeStart < 0) {
                var startsBefore = true;
                relativeStart = 0
            }
            if (relativeEnd > 24) {
                var endsAfter = true;
                relativeEnd = 24
            }
            return <div key={event.uid}
                        className={
                                    'day-grid__event' +
                                    (startsBefore ? ' day-grid__event_starts-before' : '') +
                                    (endsAfter ? ' day-grid__event_ends-after':'')
                                }
                        style={{
                                      background: event.background,
                                      borderColor: Color(event.background).darken(0.6).rgbString(),
                                      color: Color(event.background).light() ? 'black' : 'white',
                                      display: event.visible !== false ? 'block' : 'none',
                                      position: 'absolute',
                                      top: 'calc(100%/24*' + relativeStart + ' + 1px)',
                                      height: 'calc(100%/24*' + (relativeEnd - relativeStart) + ' - 4px)',
                                      left: 'calc((100% - 6px) * ' + left/100 + ' + 2px)',
                                      width: 'calc((100% - 6px) * ' + width/100 + ')'
                        }}
                        onMouseDown={this.startDrag.bind(this, event)}
                        onClick={this.clickEvent.bind(this, event)}>
                {event.title} ({eventLineIndex}, {eventData.index})
            </div>;
        },
        renderEventLine: function (eventLineIndex, eventline, freeSpaceData) {
            return eventline.map((eventData)=> {
                    var widthPercent = 1 / (eventData.index === 1 ? 1 : (eventData.index * 0.6 + 0.2));
                    var freeSpace = 100;
                    var i;
                    for (i = eventData.start; i < eventData.end; i++) {
                        if (freeSpaceData[i] !== void 0 && freeSpace > freeSpaceData[i]) {
                            freeSpace = freeSpaceData[i];
                        }
                    }
                    var takenWidth = freeSpace * widthPercent;
                    var nextFreeSpace = freeSpace - takenWidth * 0.6;
                    for (i = eventData.start; i < eventData.end; i++) {
                        freeSpaceData[i] = nextFreeSpace;
                    }
                    return this.renderEvent(eventData, eventLineIndex, 100 - freeSpace, takenWidth);
                });
        },
        render: function() {
            var eventsLayout = this.props.holder.getEventForDate(this.state.currentDay).getNormalEvents().layout();
            var linesMarkup = [];
            var freeSpaceData = {};
            for (var i = 0; i < eventsLayout.length; i++) {
                linesMarkup = linesMarkup.concat(this.renderEventLine(i, eventsLayout[i], freeSpaceData));
            }
            var projectionEvents = this.props.projectionHolder.getEventForDate(this.state.currentDay).getNormalEvents();
            if (!projectionEvents.isEmpty()) {
                var projection = projectionEvents.events[0];
                linesMarkup.push(<div key="projection" className="event-line event-line__projection">{
                    this.renderEvent({e: projection, index: 1}, 'projection', 0, 100)
                }</div>);
            }
            return <div {...this.props}>
                {this.state.renderHours ? <ReactOroCalendar.HourLine /> : void 0}
                <div className="day-grid__relative-wrapper" onMouseMove={this.processDrag} onMouseUp={this.stopDrag}>
                    <div className="day-grid"></div>
                    <div className="event-lines">
                        {linesMarkup}
                    </div>
                </div>
            </div>;
        },
        startDrag: function(event, mouseEvent) {
            dragContext.data = {
                x: mouseEvent.clientX,
                y: mouseEvent.clientY,
                event: event
            };
        },
        processDrag: function(mouseEvent) {
            if (dragContext.data) {
                var delta = {
                    x: mouseEvent.clientX - dragContext.data.x,
                    y: mouseEvent.clientY - dragContext.data.y
                };
                var snapDelta = Math.round(delta.y / 21) / 2;
                if (snapDelta !== 0 || dragContext.projection) {
                    var mainEvent = dragContext.data.event;
                    var start = mainEvent.start.clone().add(snapDelta, 'h');
                    var end = mainEvent.end.clone().add(snapDelta, 'h');
                    var oldStart = start.clone();
                    start.year(this.state.currentDay.year())
                         .month(this.state.currentDay.month())
                         .date(this.state.currentDay.date());
                    end = end.add(start.diff(oldStart));
                    if (!dragContext.projection) {
                        //show projection
                        mainEvent.visible = false;
                        this.props.holder.sendUpdates(mainEvent);

                        var projectionEvent = new CalendarData.Event(
                            start,
                            end,
                            mainEvent.title,
                            mainEvent.group
                        );
                        projectionEvent.background = mainEvent.background;
                        dragContext.projection = projectionEvent;
                        this.props.projectionHolder.enableGroup(projectionEvent.group);
                        this.props.projectionHolder.addEvent(projectionEvent);
                        return;
                    }
                    dragContext.projection.start = start;
                    dragContext.projection.end = end;
                    this.props.projectionHolder.sendUpdates(dragContext.projection);
                }
            }
        },
        stopDrag: function(event, mouseEvent) {
            if (dragContext.data) {
                if (dragContext.projection) {
                    dragContext.data.event.start = dragContext.projection.start;
                    dragContext.data.event.end = dragContext.projection.end;
                    dragContext.data.event.visible = true;
                    this.props.holder.sendUpdates(dragContext.data.event);
                    this.props.projectionHolder.removeEvent(dragContext.projection);
                    this.props.projectionHolder.disableGroup(dragContext.projection.group);
                    delete dragContext.projection;
                }
                delete dragContext.data;
            }
        },
        clickEvent: function (event) {
            console.log('click', event);
        }
    }),
    AgendaView: React.createClass({
        render: function() {
            return <div>AgendaView</div>;
        }
    }),
    HourLine: React.createClass({
        render: function() {
            var hours = [];
            for (var i = 0; i < 24; i++) {
                hours.push(<div className="hour-line__hour" key={i}>{i}:00</div>);
            }
            return <div className="hour-line">{hours}</div>;
        }
    })
};
module.exports = ReactOroCalendar;
