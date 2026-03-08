require('dotenv').config();
const Contact = require('./models/Contact');
const Conversation = require('./models/Conversation');
const Label = require('./models/Label');

async function fix() {
    try {
        const labels = await Label.findAll();
        const validIds = new Set(labels.map(l => l.id));

        const contacts = await Contact.findAll();
        let count = 0;
        for (let c of contacts) {
            if (c.labels && c.labels.length > 0) {
                let orig = c.labels.length;
                let newLabels = c.labels.filter(l => validIds.has(l.id));
                if (newLabels.length !== orig) {
                    await c.update({ labels: newLabels });
                    count++;
                    console.log('Cleaned contact: ' + c.phone);
                }
            }
        }

        const convs = await Conversation.findAll();
        let cCount = 0;
        for (let c of convs) {
            if (c.labels && c.labels.length > 0) {
                let orig = c.labels.length;
                let newLabels = c.labels.filter(l => validIds.has(l.id));
                if (newLabels.length !== orig) {
                    await c.update({ labels: newLabels });
                    cCount++;
                    console.log('Cleaned conv: ' + c.id);
                }
            }
        }

        console.log('Cleaned ' + count + ' contacts.');
        console.log('Cleaned ' + cCount + ' conversations.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
