const http = require('http');
const micro = require('micro');
const listen = require('test-listen');
const request = require('request-promise');
const qs = require('qs');

const path = require('path');
const fs = require('fs')

const roll = require('../index');

let url, service;
beforeAll(async () => {
    service = micro(roll);
    url = await listen(service);
})

afterAll(() => {
    service.close()
})

test('returns index with a get request', async () => {
    const body = await request(url, {
        method: 'GET',
        body: '2d8+5 something'
    });
    const document = path.join(__dirname, '../index.html');
    const html = fs.readFileSync(document, 'utf8');
    expect(body).toBe(html);
});

test('Message should have a single attachment', async () => {
    const body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: '2d8+5 something',
            user_name: 'test'
        })
    });

    const { attachments } = JSON.parse(body);
    expect(attachments.length).toBe(1);
});

test('Attachment fallback should be a string', async () => {
    const body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: '2d8+5 something',
            user_name: 'test'
        })
    });
    const { attachments } = JSON.parse(body);
    const { fallback, color, text, fields } = attachments[0];
    expect(typeof(fallback)).toBe('string');
});

test('Attachment color should be green', async () => {
    const body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: '2d8+5 something',
            user_name: 'test'
        })
    });

    const { attachments } = JSON.parse(body);
    const { fallback, color, text, fields } = attachments[0];
    expect(color).toBe('#00ff00');
});

test('Text should start with username', async () => {
    const body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: '2d8+5 something',
            user_name: 'test'
        })
    });

    const { attachments } = JSON.parse(body);
    const { fallback, color, text, fields } = attachments[0];
    expect(text.substring(0, 5)).toBe('@test');
});

test('Test all possible fields length combinations', async () => {
    var body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: '2d8+5 something',
            user_name: 'test'
        })
    });

    var { attachments } = JSON.parse(body);
    var { fallback, color, text, fields } = attachments[0];
    expect(fields.length).toBe(6);

    var body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: 'd8+5 something',
            user_name: 'test'
        })
    });

    var { attachments } = JSON.parse(body);
    var { fallback, color, text, fields } = attachments[0];
    expect(fields.length).toBe(6);

    var body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: '2d8 something',
            user_name: 'test'
        })
    });

    var { attachments } = JSON.parse(body);
    var { fallback, color, text, fields } = attachments[0];
    expect(fields.length).toBe(3);

    var body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: '2d8',
            user_name: 'test'
        })
    });

    var { attachments } = JSON.parse(body);
    var { fallback, color, text, fields } = attachments[0];
    expect(fields.length).toBe(2);

    var body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: '2d8+5',
            user_name: 'test'
        })
    });

    var { attachments } = JSON.parse(body);
    var { fallback, color, text, fields } = attachments[0];
    expect(fields.length).toBe(5);
});

test('Should fail', async () => {
    const body = await request(url, {
        method: 'POST',
        body: qs.stringify({
            text: 'bad string',
            user_name: 'test'
        })
    });

    const { attachments } = JSON.parse(body);
    const { fallback, color, text, fields, title } = attachments[0];
    expect(color).toBe('#ff0000');
    expect(title).toBe('Invalid input')
});