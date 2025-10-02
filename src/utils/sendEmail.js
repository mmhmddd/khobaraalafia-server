import transporter from "../config/mailer.js";

const sendEmail = async (options) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
};



export default sendEmail;
