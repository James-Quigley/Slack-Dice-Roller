const { text } = require("micro");

function randomDiceRoll(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

module.exports = async (req, res) => {
  const body = await text(req);
  console.log("Body", body);

  const [num, sides] = body.toLowerCase().split('d').map((n) => parseInt(n));

  let total = 0;
  for (let i = 0; i < num; i++){
    total += randomDiceRoll(sides);
  };
  

  const message = "`" + body.text + "`: " + total;
  const response_type = "in_channel";

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ response_type, text: message }));
};
