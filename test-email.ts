import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "kobarbayedame6@gmail.com",
    pass: "vncb yyuw wrpt ofrm",
  },
});

console.log("Testing SMTP connection...");
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
    process.exit(1);
  } else {
    console.log("SMTP Server is ready!");
    process.exit(0);
  }
});
