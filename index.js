var icalToolkit = require('ical-toolkit');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var express = require("express");
var cors = require('cors');
var data = require('./data.js');
const crypto = require("crypto");
const axios = require('axios');

var app = express();


app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(cors())

app.get("/call/callscheduler", (req, res, next) => {
    res.json('working');
});

app.post("/call/callscheduler", (req, res, next) => {
    const uuid = crypto.randomBytes(3*4).toString('base64')

    console.log(req._body)
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
        summary: 'Customer Event',
        alarms: [15, 10, 5],
        stamp: new Date,
        location: 'Office',
        description: 'Customer Meeting!',
        uid: uuid
        /*attendees: [
            {
                name: req.body.username, //Required
                email: req.body.username + '@co-opbank.co.ke', //Required
                status: 'ACCEPTED', //Optional
                role: 'REQ-PARTICIPANT', //Optional
                rsvp: true //Optional, adds 'RSVP=TRUE' , tells the application that organiser needs a RSVP response.
            }
        ]*/
    })

    var icsFileContent = builder.toString();
    var smtpOptions = {
        host: data.smtpserver,
        port: data.smtpport,
        //secureConnection: true,
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
        to: data.to,
        subject: 'Customer Meeting - ' + req.body.custname,
        html: "<h2>Meeting with "+req.body.custname+"</h2><p style=\"font-size: 1.5em;\">Details: "+req.body.notemade+"</p><p style=\"font-size: 1.5em;\"><a href=\""+req.body.link+"\">Link to E-Collect</a></p><p>&nbsp;</p>",
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
                uid: uuid
            })
            // save to tbl_callschedule table
            const body = {
                uuid: uuid,
                accnumber: req.body.accnumber,
                custname: req.body.custname,
                notemade: req.body.notemade,
                startdate: req.body.startdatetosave,
                owner: req.body.username
            }
            axios({
                method: 'post',
                url: data.url + '/nodeapi/tbl-callschedules',
                data: body
              }).then(function (response) {
                console.log(response);
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
        //secureConnection: true,
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
        to: data.to,
        subject: 'Customer Meeting - ' + req.body.custname,
        html: "<h2>Meeting with "+req.body.custname+"</h2><p style=\"font-size: 1.5em;\">Details: "+req.body.notemade+"</p><p style=\"font-size: 1.5em;\"><a href=\""+req.body.link+"\">Link to E-Collect</a></p><p>&nbsp;</p>",
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
                uid: uuid
            })
        }
    });
});

app.listen(9000, () => {
    console.log("Server running on port 9000");
});