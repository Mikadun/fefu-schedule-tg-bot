const fetch = require('node-fetch');
var ics = require('./ics-handler').ics();
const fs = require('fs');

const infoListPath = 'data/info.json';
var infoList = JSON.parse(fs.readFileSync(infoListPath));

function getUrl(info, start, end) {
    const BASE_URL = 'https://univer.dvfu.ru/schedule/get/?type=listWeek&start=' + start + '&end=' + end;
    const words = (info.match(/ /g) || []).length + 1;
    if (words == 1) {
        const group = infoList.groups.find((pair) => pair.name == info)
        if (group != undefined)
            return BASE_URL + '&groups%5B%5D=' + group.value + '&ppsId=';
    }

    if (words == 3) {
        const teacher = infoList.teachers.find((pair) => pair.name == info)
        if (teacher != undefined)
            return BASE_URL + '&ppsId=' + teacher.value;
    }

    throw 'Неправильное имя группы или фио преподавателя';
}

exports.getSchedule = async function(info) {

    var semesterStart = '2019-09-23';
    var semesterEnd = '2020-01-03';

    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
        return [d.getUTCFullYear(), weekNo];
    }

    var url;
    try {
        url = getUrl(info, semesterStart, semesterEnd);
    } catch (err) {
        throw err;
    }

    var data = await fetch(url, {
        'credentials': 'include',
        'headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'X-Requested-With': 'XMLHttpRequest'
        },
        'method': 'GET',
    });

    var dataJson = await data.json();
    let busyDaysHash = {};

    for (let event of dataJson.events) {
        let dateStart = new Date(event.start);
        let dateEnd = new Date(event.end);

        let subgroup = event.subgroup;

        let hashedString =  dateStart.getDay().toString() + dateStart.getHours().toString() + dateStart.getMinutes().toString() + subgroup.toString();

        if (hashedString in busyDaysHash) {
            let busyDay = busyDaysHash[hashedString];
            
            let week = getWeekNumber(dateStart)[1];

            if (week < busyDay.week) {
                continue;
            }

            busyDay.frequency = week - busyDay.week;
            busyDay.week = week;
        } else {
            busyDaysHash[hashedString] = { event: event, week: getWeekNumber(dateStart)[1] };
        }    
    }

    var twoLetterWeekDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    Object.values(busyDaysHash).forEach(function(bd) {

        var subgroup = bd.event.subgroup ? ' Подгруппа ' + bd.event.subgroup + ' ': '';

        ics.addEvent(bd.event.title + ' (' + bd.event.pps_load + ') ' + subgroup, bd.event.group + ' ' + bd.event.pps_load, bd.event.classroom, bd.event.start, bd.event.end, {
            freq: 'WEEKLY',
            until: semesterEnd,
            interval: bd.frequency,
            byday: [ twoLetterWeekDays[(new Date(bd.event.start)).getDay()] ]
        });
    });

    return ics.createFile('calendar_' + info.replace(/ /g, '_'));
}

if (!module.parent) {
    exports.getSchedule();
}