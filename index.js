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
  console.log("METHOD", req.method);
  if (req.method == "GET") {
    res.end(html);
    return;
  }
  const body = parse(await text(req));
  console.log("Body", body);

  const bodyText = body.text.toLowerCase();

  let message, attachments;
  if (!/^\d+d\d+$/.test(bodyText)){
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
