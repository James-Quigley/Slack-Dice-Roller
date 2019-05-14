const { text } = require("micro");
const { parse } = require("querystring");
const fs = require('fs');
const path = require('path');
const qs = require('qs');
const crypto = require('crypto');

const document = path.join(__dirname, 'index.html');
const html = fs.readFileSync(document);

function randomDiceRoll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

const MAX_DICE = 1000;
const MAX_SIDES = 100;

module.exports = async (req, res) => {
  if (req.method == "GET") {
    res.end(html);
    return;
  }
  const rawBody = await text(req);
  const body = parse(rawBody);

  const bodyText = body.text ? body.text.toLowerCase() : '';

  const qsBody = qs.stringify(body, { format: 'RFC1738' });
  var slackSignature = req.headers['x-slack-signature'];
  var timestamp = req.headers['x-slack-request-timestamp'];

  if (!slackSignature || !timestamp){
    return;
  }

  var sigBasestring = 'v0:' + timestamp + ':' + qsBody;

  const slackSigningSecret = process.env.DICE_ROLL_SLACK_SIGNING_SECRET;

  var mySignature = 'v0=' +
    crypto.createHmac('sha256', slackSigningSecret)
      .update(sigBasestring, 'utf8')
      .digest('hex');

  if (!crypto.timingSafeEqual(
    new Buffer(mySignature, 'utf8'),
    new Buffer(slackSignature, 'utf8'))) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Signature verification failed");
    return;
  }

  

  let attachments;

  if (bodyText == 'help'){
    attachments = [
      {
        text: "This slash command is to simulate rolling dice. The first number in the command is the number of dice to roll. The second number is the number of sides that die should have. For example a `/roll 2d6` will have a result between 2 and 12.",
        fallback: "This slash command is to simulate rolling dice. The first number in the command is the number of dice to roll. The second number is the number of sides that die should have. For example a `/roll 2d6` will have a result between 2 and 12.",
        color: "#ffff00",
        title: "Help"
      }
    ];
  } else if (!/^\d+d\d+( .+)?$/.test(bodyText)){
    attachments = [
      {
        text: "Please type an input in the format ndx, where _n_ is the number of dice to roll, and _x_ is the number of sides on each die",
        fallback: "Please type an input in the format ndx, where _n_ is the number of dice to roll, and _x_ is the number of sides on each die",
        color: "#ff0000",
        title: "Invalid input"
      }
    ];
  } else {
    const [rollText, ...reasonArr] = body.text.split(" ");
    const [num, sides] = rollText.text.split('d').map((n) => parseInt(n));

    let reason;
    if (reasonArr.length){
      reason = reasonArr.join(" ");
    }

    if (sides < 2){
      attachments = [
        {
          text: "When you find a fair die with that many sides, let me know",
          fallback: "When you find a fair die with that many sides, let me know",
          color: "#ff0000",
          title: "Invalid input"
        }
      ];
    } else if (num < 1) {
      attachments = [
        {
          text: "I need to roll at least one die",
          fallback: "I need to roll at least one die",
          color: "#ff0000",
          title: "Invalid input"
        }
      ];
    } else if (num > MAX_DICE) {
      attachments = [
        {
          text: `${MAX_DICE} dice maximum`,
          fallback: `${MAX_DICE} dice maximum`,
          color: "#ff0000",
          title: "Invalid input"
        }
      ];
    } else if (sides > MAX_SIDES) {
      attachments = [
        {
          text: `${MAX_SIDES} sides maximum`,
          fallback: `${MAX_SIDES} sides maximum`,
          color: "#ff0000",
          title: "Invalid input"
        }
      ];
    } else {
      let total = 0;
      let rolls = [];
      for (let i = 0; i < num; i++) {
        let roll = randomDiceRoll(sides);
        total += roll;
        rolls.push(roll);
      };

      console.log(`ROLL: ${num}d${sides} = ${total}`);
  
      attachments = [
        {
          fallback: "`" + body.text + "`: " + total,
          color: "#00ff00",
          text: `@${body.user_name} rolled a *${total}*`,
          fields: [
            {
              title: "Die",
              value: bodyText,
              short: true
            },
            {
              title: "Rolls",
              value: num <= 100 ? rolls.join(", ") : "You're just going to have to trust me on this one",
              short: true
            }
          ],
          footer: sides == 2 ? "Also known as a coin" : undefined
        }
      ];

      if (reason) {
        attachments[0].fields.push({
          title: "Reason",
          value: reason,
          short: true
        });
      }
    }
  }

  
  const response_type = "in_channel";

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ response_type, attachments }));
};
