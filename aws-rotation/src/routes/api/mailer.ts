// var nodemailer = require('nodemailer');
import nodemailer from 'nodemailer';
import { logger } from './utils';
import { env } from "$env/dynamic/public";

let transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: env.PUBLIC_EMAIL ?? '',
        pass: env.PUBLIC_EMAIL_PASSWORD ?? '',
    }
});

export function sendEmail(to: string, subject: string, text: string) {
    let mailOptions = {
        from: 'dummydeveloper10@gmail.com',
        to: to,
        subject: subject,
        text: text,
    };

    transport.sendMail(mailOptions, (error, info) => {
        if (error) {
            logger.error(`Email sending failed`);
        } else {
            logger.error('Email Sent: ' + info.response);
        }
    });
}

export function sendErrorMail(text: string) {
    // let to = 'shrnemati@gmail.com';
    let to = env.PUBLIC_EMAIL_TO ?? '';
    let subject = 'Server error';
    sendEmail(to, subject, text);
}
