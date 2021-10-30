var icalToolkit = require('ical-toolkit');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var express = require("express");
var cors = require('cors');
var data = require('./data.js');
const moment = require("moment");
const axios = require('axios');
const https = require('https')
const { writeFileSync } = require('fs')
var Minio = require("minio");
const fs = require('fs')

var app = express();


app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

var minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
    port: process.env.MINIO_PORT || 9005,
    useSSL: false,
    accessKey: process.env.ACCESSKEY || 'AKIAIOSFODNN7EXAMPLE',
    secretKey: process.env.SECRETKEY || 'wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY'
});

app.use(cors())

app.get("/call/callscheduler", (req, res, next) => {
    res.json('working');
});

app.post("/call/callscheduler/fordownload", (req, res, next) => {
    const uuid = (moment().unix()).toString();
    //Create a iCal object
    var builder = icalToolkit.createIcsFileBuilder();
    builder.spacers = true;
    builder.NEWLINE_CHAR = '\r\n';
    builder.throwError = true;
    builder.ignoreTZIDMismatch = true;
    builder.calname = 'E-Collect';
    builder.method = 'REQUEST';
    builder.timezone = 'africa/nairobi';
    builder.tzid = 'africa/nairobi';
    //Add the event data
    var d1 = new Date(req.body.scheduledate),
        d2 = new Date(d1);
    d2.setMinutes(d1.getMinutes() + 30);

    builder.events.push({
        start: d1,
        end: d2,
        transp: 'OPAQUE',
        summary: 'Customer Meeting with ' + req.body.custname + ', a/c:' + req.body.accnumber,
        alarms: [15, 10, 5],
        stamp: new Date,
        location: 'Office',
        description: "Meeting with " + req.body.custname +  " Details: " + req.body.collectornote + ", " + req.body.link ,
        //description: "<h2>Meeting with " + req.body.custname + "</h2><p style=\"font-size: 1.5em;\">Details: " + req.body.collectornote + "</p><p style=\"font-size: 1.5em;\"><a href=\"" + req.body.link + "\">Link to E-Collect</a></p><p>&nbsp;</p>",
        uid: uuid,
        //Optional Organizer info
        organizer: {
            name: 'E-Collect',
            email: 'ecollect@co-opbank.co.ke'
            //sentBy: 'person_acting_on_behalf_of_organizer@email.com' //OPTIONAL email address of the person who is acting on behalf of organizer.
        },
        attendees: [
            {
                name: req.body.username, //Required
                email: req.body.username + '@co-opbank.co.ke', //Required 'kevin.abongo@royalcyber.com',//
                status: 'NEEDS-ACTION', //Optional
                role: 'REQ-PARTICIPANT', //Optional
                rsvp: true //Optional, adds 'RSVP=TRUE' , tells the application that organiser needs a RSVP response.
            }
        ],
        //What to do on addition
        method: 'PUBLISH',
        //Status of event
        status: 'CONFIRMED'
    })

    var icsFileContent = builder.toString();
    //var json = icalToolkit.parseToJSON(icsFileContent);
    writeFileSync(`${__dirname}/event.ics`, icsFileContent)
    var metaData = {
        'Content-Type': 'text/calendar'
    }
    minioClient.fPutObject("meetings", uuid + '_event.ics', `${__dirname}/event.ics`, metaData, function (error, etag) {
        if (error) {
            //return console.log(error);
            res.json({
                result: 'ERROR',
                message: error.message
            })
        }
        // remove file
        fs.unlink(`${__dirname}/event.ics`, (err) => {
            if (err) {
                console.error(err)
                return
            }
            //file removed
        })

        // save to tbl_callschedule table
        const body = {
            uuid: uuid,
            accnumber: req.body.accnumber,
            custname: req.body.custname,
            notemade: req.body.collectornote,
            startdate: req.body.scheduledate,
            owner: req.body.username,
            link: data.serverurl + '/meetings/' + uuid + '_event.ics'
        }

        axios.post(data.url + '/nodeapi/tbl-callschedules', body)
            .then(function (response) {
                res.json({
                    result: 'OK',
                    message: 'response',
                    uid: uuid,
                    link: data.serverurl + '/meetings/' + uuid + '_event.ics'
                })
            })
            .catch(function (error) {
                res.json({
                    result: 'ERROR',
                    message: error.message
                })
            })
            .then(function () {
                // always executed
            });
    });

    //const agent = new https.Agent({ rejectUnauthorized: false })
});

app.post("/call/callscheduler", (req, res, next) => {
    const uuid = (moment().unix()).toString();
    console.log(data)
    //Create a iCal object
    var builder = icalToolkit.createIcsFileBuilder();
    builder.spacers = true;
    builder.NEWLINE_CHAR = '\r\n';
    builder.throwError = true;
    builder.ignoreTZIDMismatch = true;
    builder.calname = 'E-Collect';
    builder.method = 'REQUEST';
    builder.timezone = 'africa/nairobi';
    builder.tzid = 'africa/nairobi';
    //Add the event data
    var d1 = new Date(req.body.startdate),
        d2 = new Date(d1);
    d2.setMinutes(d1.getMinutes() + 30);

    builder.events.push({
        start: d1,
        end: d2,
        transp: 'OPAQUE',
        summary: 'Customer Meeting with ' + req.body.custname + ', a/c:' + req.body.accnumber,
        alarms: [15, 10, 5],
        stamp: new Date,
        location: 'Office',
        //description: 'Customer Meeting!',
        description: "<h2>Meeting with " + req.body.custname + "</h2><p style=\"font-size: 1.5em;\">Details: " + req.body.notemade + "</p><p style=\"font-size: 1.5em;\"><a href=\"" + req.body.link + "\">Link to E-Collect</a></p><p>&nbsp;</p>",
        uid: uuid,
        attendees: [
            {
                name: req.body.username, //Required
                email: req.body.username + '@co-opbank.co.ke', //Required 'kevin.abongo@royalcyber.com',//
                status: 'ACCEPTED', //Optional
                role: 'REQ-PARTICIPANT', //Optional
                rsvp: true //Optional, adds 'RSVP=TRUE' , tells the application that organiser needs a RSVP response.
            }
        ]
    })

    var icsFileContent = builder.toString();
    var smtpOptions = {
        host: data.smtpserver,
        port: data.smtpport,
        secure: false, // upgrade later with STARTTLS
        tls: { rejectUnauthorized: false },
        debug: true,
        auth: {
            user: data.smtpuser,
            pass: data.pass
        }
    };

    var transporter = nodemailer.createTransport(smtpTransport(smtpOptions));
    //var json = icalToolkit.parseToJSON(icsFileContent);
    writeFileSync(`${__dirname}/event.ics`, icsFileContent)
    var metaData = {
        'Content-Type': 'text/calendar'
    }
    minioClient.fPutObject("meetings", uuid + '_event.ics', `${__dirname}/event.ics`, metaData, function (error, etag) {
        if (error) {
            return console.log(error);
        }
        // remove file
        fs.unlink(`${__dirname}/event.ics`, (err) => {
            if (err) {
                console.error(err)
                return
            }
            //file removed
        })
    });

    var mailOptions = {
        from: data.from,
        to: req.body.username + '@co-opbank.co.ke',
        subject: 'Customer Meeting with ' + req.body.custname + ', a/c:' + req.body.accnumber,
        html: "<h2>Meeting with " + req.body.custname + "</h2><p style=\"font-size: 1.5em;\">Details: " + req.body.notemade + "</p><p style=\"font-size: 1.5em;\"><a href=\"" + req.body.link + "\">Link to E-Collect</a></p><p>&nbsp;</p>",
        alternatives: [{
            contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
            content: icsFileContent.toString()
        }]
    };
    //send mail with defined transport object 

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            res.status(500).json({
                result: 'Error',
                message: error.message
            })
        }
        else {
            console.log('Message sent: ' + info.response);
            res.json({
                result: 'OK',
                message: info.response,
                uid: uuid,
                link: data.serverurl + '/meetings/' + uuid + '_event.ics'
            })
            // save to tbl_callschedule table
            const body = {
                uuid: uuid,
                accnumber: req.body.accnumber,
                custname: req.body.custname,
                notemade: req.body.notemade,
                startdate: req.body.startdatetosave,
                owner: req.body.username,
                link: data.serverurl + '/meetings/' + uuid + '_event.ics'
            }

            const agent = new https.Agent({ rejectUnauthorized: false })
            axios.post(data.url + '/nodeapi/tbl-callschedules', body, { httpsAgent: agent })
                .then(function (response) {
                    console.log('statusText: OK');
                })
                .catch(function (error) {
                    console.log(error);
                })
                .then(function () {
                    // always executed
                });
        }
    });
});

app.post("/call/cancel-callscheduler", (req, res, next) => {
    const uuid = req.body.uuid;
    //Create a iCal object
    var builder = icalToolkit.createIcsFileBuilder();
    builder.spacers = true;
    builder.NEWLINE_CHAR = '\r\n';
    builder.throwError = true;
    builder.ignoreTZIDMismatch = true;
    builder.calname = 'E-Collect';
    builder.method = 'CANCEL';
    builder.timezone = 'africa/nairobi';
    builder.tzid = 'africa/nairobi';
    //Add the event data
    var d1 = new Date(req.body.startdate),
        d2 = new Date(d1);
    d2.setMinutes(d1.getMinutes() + 30);

    builder.events.push({
        start: d1,
        end: d2,
        transp: 'OPAQUE',
        summary: 'Customer Event',
        alarms: [15, 10, 5],
        stamp: new Date,
        location: 'Office',
        description: 'Customer Meeting!',
        uid: uuid
    })

    var icsFileContent = builder.toString();
    var smtpOptions = {
        host: data.smtpserver,
        port: data.smtpport,
        secure: false, // upgrade later with STARTTLS
        tls: { rejectUnauthorized: false },
        debug: true,
        auth: {
            user: data.smtpuser,
            pass: data.pass
        }
    };

    var transporter = nodemailer.createTransport(smtpTransport(smtpOptions));
    //var json = icalToolkit.parseToJSON(icsFileContent);

    var mailOptions = {
        from: data.from,
        to: req.body.username + '@co-opbank.co.ke',
        subject: 'Customer Meeting with ' + req.body.custname + ', a/c:' + req.body.accnumber,
        html: "<h2>Meeting with " + req.body.custname + "</h2><p style=\"font-size: 1.5em;\">Details: " + req.body.notemade + "</p><p style=\"font-size: 1.5em;\"><a href=\"" + req.body.link + "\">Link to E-Collect</a></p><p>&nbsp;</p>",
        alternatives: [{
            contentType: 'text/calendar; charset="utf-8"; method=CANCEL',
            content: icsFileContent.toString()
        }]
    };
    //send mail with defined transport object 
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            res.status(500).json({
                result: 'Error',
                message: error.message
            })
        }
        else {
            console.log('Message sent: ' + info.response);
            res.json({
                result: 'OK',
                message: info.response,
                uid: uuid
            })
        }
    });
});

app.listen(9000, () => {
    console.log("Server running on port 9000");
});