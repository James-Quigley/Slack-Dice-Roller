const { text } = require("micro");
const { parse } = require("querystring");
const fs = require('fs');
const path = require('path');
const qs = require('qs');
const crypto = require('crypto');
const uuid = require('uuid/v4');

const document = path.join(__dirname, 'index.html');
const html = fs.readFileSync(document);

function randomDiceRoll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

const DEVELOPMENT = process.env.DEVELOPMENT;

const MAX_DICE = 1000;
const MAX_SIDES = 100;

const REGEX = /^(\d*)d(\d+)([\+\-]\d+)?( .+)?$/;

module.exports = async (req, res) => {
  if (req.method == "GET") {
    res.end(html);
    return;
  }
  const rawBody = await text(req);
  const body = parse(rawBody);

  let bodyText = body.text ? body.text.toLowerCase() : '';
  let prefix = process.env.NOW_GITHUB_COMMIT_REF === 'dev' ? '_DEV' : '';

  if (!DEVELOPMENT) {
    const qsBody = qs.stringify(body, { format: 'RFC1738' });
    var slackSignature = req.headers['x-slack-signature'];
    var timestamp = req.headers['x-slack-request-timestamp'];
  
    if ((!slackSignature || !timestamp) && !DEVELOPMENT) {
      return;
    }
  
    var sigBasestring = 'v0:' + timestamp + ':' + qsBody;
  
    const slackSigningSecret = process.env[`DICE_ROLL${prefix}_SLACK_SIGNING_SECRET`];
  
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
  }




  let attachments, num, sides, rolls, total, reason, writeDDB;

  if (bodyText == 'help') {
    attachments = [
      {
        text: "This slash command is to simulate rolling dice. The first number in the command is the number of dice to roll. The second number is the number of sides that die should have. For example a `/roll 2d6` will have a result between 2 and 12.",
        fallback: "This slash command is to simulate rolling dice. The first number in the command is the number of dice to roll. The second number is the number of sides that die should have. For example a `/roll 2d6` will have a result between 2 and 12.",
        color: "#ffff00",
        title: "Help"
      },{
        text: "If you omit the first number, it will default to a single die. You can also include a modifier and/or a reason for the roll, e.g. `1d20+2 initiative`. The modifier will be added to the total and the reason will be displayed for others to see.",
        fallback: "If you omit the first number, it will default to a single die. You can also include a modifier and/or a reason for the roll, e.g. `1d20+2 initiative`. The modifier will be added to the total and the reason will be displayed for others to see.",
        color: "#ffff00",
        title: "Advanced"
      }
    ];
    error = true;
  } else if (!REGEX.test(bodyText) && bodyText.trim() != '') {
    attachments = [
      {
        text: "Please type an input in the format ndx, where _n_ is the number of dice to roll, and _x_ is the number of sides on each die",
        fallback: "Please type an input in the format ndx, where _n_ is the number of dice to roll, and _x_ is the number of sides on each die",
        color: "#ff0000",
        title: "Invalid input"
      }
    ];
  } else {
    let reason, num, sides, modifier;
    if (bodyText.trim() == ''){
      reason = '';
      num = 1;
      sides = 20;
      modifier = 0;
    } else {
      const match = bodyText.match(REGEX).slice(1, 5);
      reason = match[match.length - 1];
      [num, sides, modifier] = match.slice(0, match.length - 1).map(n => parseInt(n));
    }

    if (isNaN(num)){
      num = 1;
    }

    if (isNaN(modifier)){
      modifier = 0;
    }

    if (sides < 2) {
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
      total = 0;
      rolls = [];
      for (let i = 0; i < num; i++) {
        let roll = randomDiceRoll(sides);
        total += roll;
        rolls.push(roll);
      };

      if (!DEVELOPMENT) console.log(`ROLL: ${num}d${sides} = ${total}`);
      writeDDB = !prefix.length && !DEVELOPMENT;

      total += modifier;

      attachments = [
        {
          fallback: "`" + body.text + "`: " + total,
          color: "#00ff00",
          text: `<@${body.user_id}> rolled a *${total}*`,
          fields: [
            {
              title: "Die",
              value: `d${sides}`,
              short: true
            },
            {
              title: num > 1 ? "Rolls" : "Roll",
              value: num <= 100 ? rolls.join(", ") : "You're just going to have to trust me on this one",
              short: true
            }
          ],
          footer: sides == 2 ? "Also known as a coin" : undefined
        }
      ];
      
      if (modifier) {
        attachments[0].fields.push({
          title: "Base Total",
          value: total-modifier,
          short: true
        });
        attachments[0].fields.push({
          title: "Modifier",
          value: modifier,
          short: true
        });
        attachments[0].fields.push({
          title: "Grand Total",
          value: total,
          short: true
        });
      }
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

  if (writeDDB) {
    const AWS = require('aws-sdk');
    AWS.config.update(
      {
        region: 'us-east-1',
        secretAccessKey: process.env.DICE_ROLL_AWS_SECRET_ACCESS_KEY,
        accessKeyId: process.env.DICE_ROLL_AWS_ACCESS_KEY_ID
      });
    const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
    var params = {
      Item: {
        "uuid": {
          S: uuid()
        },
        "Sides": {
          N: sides + ""
        },
        "Num": {
          N: num + ""
        },
        "Total": {
          N: total + ""
        },
        "Rolls": {
          L: rolls.map(roll => ({ N: roll + "" }))
        },
        "Date": {
          N: Date.now() + ""
        }
      },
      TableName: "slack-dice-rolls"
    };
    if (reason) {
      params.Item.Reason = {
        S: reason
      }
    }
    ddb.putItem(params, function (err, data) {
      if (err) console.log(err, err.stack);
    });
  }
};
