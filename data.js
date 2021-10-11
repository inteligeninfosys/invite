module.exports = {
    smtpserver: process.env.SMTPSERVER || 'smtp.gmail.com', //host: 'smtp.gmail.com',office365.officer
    smtpport: process.env.SMTPPORT || 587,
    smtpuser: process.env.SMTPUSER || 'ecollectsystem@gmail.com',
    pass:  process.env.PASS || 'W1ndowsxp',
    from: process.env.FROM || 'ecollectsystem@gmail.com',
    to: process.env.TO || 'kevin.abongo@royalcyber.com',
    url: process.env.URL || 'http://localhost:6001',
    serverurl: process.env.SERVERURL || 'http://localhost:9005',
}