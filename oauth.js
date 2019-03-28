const fetch = require("node-fetch");
const { parse, stringify } = require("querystring");

module.exports = async (req, res) => {
  // Extract code received on the request url
  const urlQueryString = req.url.replace(/^.*\?/, '');
  const code = parse(urlQueryString).code;

  // Compose authHeader by encoding the string ${client_id}:${client_secret}
  const client_id = process.env.DICE_ROLL_SLACK_CLIENT_ID;
  const client_secret = process.env.DICE_ROLL_SLACK_CLIENT_SECRET;
  const Authorization = 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64');

  // Hit oauth.access for access_token
  const oauthAccess = await fetch('https://slack.com/api/oauth.access', {
    method: 'POST',
    body: stringify({ code }),
    headers: {
      Authorization,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });
  const { access_token } = await oauthAccess.json();

  // Hit auth.test for slack domain
  const authTest = await fetch('https://slack.com/api/auth.test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    }
  });
  const { url:slackUrl } = await authTest.json();

  // Send redirect response to slack domain
  res.writeHead(302, 'Redirect', { 'Location': slackUrl });
  res.end();
};
