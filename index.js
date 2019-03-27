const { text } = require("micro");
const { parse } = require("querystring");
const fs = require('fs');
const path = require('path');

const document = path.join(__dirname, 'index.html');
const html = fs.readFileSync(document);

function randomDiceRoll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

module.exports = async (req, res) => {
  if (req.method == "GET") {
    res.end(html);
    return;
  }
  const body = parse(await text(req));

  const bodyText = body.text.toLowerCase();

  let message, attachments;
  if (bodyText == 'help'){
    message = "*Help:*";
    attachments = [{ text: "This slash command is to simulate rolling dice. The first number in the command is the number of dice to roll. The second number is the number of sides that die should have. For example a `/roll 2d6` will have a result between 2 and 12." }]
  } else if (!/^\d+d\d+$/.test(bodyText)){
    message = "Invalid input";
    attachments = [{ text: "Please type an input in the format ndx, where _n_ is the number of dice to roll, and _x_ is the number of sides on each die" }];
  } else {
    const [num, sides] = body.text.toLowerCase().split('d').map((n) => parseInt(n));

    let total = 0;
    for (let i = 0; i < num; i++) {
      total += randomDiceRoll(sides);
    };


    message = "`" + body.text + "`: " + total;
  }

  
  const response_type = "in_channel";

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ response_type, text: message, attachments }));
};
