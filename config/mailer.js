const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const TOKEN_PATH = path.join(__dirname, "token.json");

// Autenticación con OAuth2
async function authorize() {
  const credentials = JSON.parse(fs.readFileSync("credentials.json"));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log(
      "Abre esta URL en tu navegador y autoriza la aplicación:",
      authUrl
    );
    // Aquí deberías detener la ejecución y esperar a que el usuario autorice la aplicación
    // Luego, guarda el token en TOKEN_PATH
  }

  return oAuth2Client;
}

// Enviar correo con Gmail
async function sendNotification(email, subject, text) {
  try {
    const auth = await authorize();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: auth._clientId,
        clientSecret: auth._clientSecret,
        refreshToken: auth.credentials.refresh_token,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Correo enviado:", result);
  } catch (error) {
    console.error("Error enviando el correo:", error);
  }
}

module.exports = { sendNotification };
