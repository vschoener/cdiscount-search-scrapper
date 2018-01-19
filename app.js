const scraper = require('scrape-it');
const nodemailer = require('nodemailer');
var fs = require('fs');

if (!fs.existsSync('./config.js')) {
    console.error('Please setting up the config.sample.js as a config.js file');
    process.exit(2);
}

const config = require('./config');
const maxPrice = 300;
const productKeeper = {};

// Search for RX 570/ 580 GPU 8GB
// This search list could be dynamic or even set in a config later 
const searchList = [
    "https://www.cdiscount.com/informatique/cartes-graphiques/ati/radeon-rx-580/l-107670274.html#_his_",
    "https://www.cdiscount.com/informatique/cartes-graphiques/ati/radeon-rx-570/l-107670273.html#_his_"
];

const promises = [];
searchList.forEach((url) => {
    let promise = scraper(url, {
        search: 'h1',
        products: {
            listItem: '#lpBloc > li',
            data: {
                title: '.prdtBILDetails > a',
                link: {
                    selector: '.prdtBILDetails > a',
                    attr: 'href'
                },
                price: {
                    selector: '.prdtBILCta',
                    convert: value => parseFloat(value.split('€').join('.'))
                },
            }
        }
    });
    promises.push(promise);
})

Promise.all(promises).then((results) => {
    let totalProducts = 0;
    results.forEach(result => {
        let searchName = result.search;
        let products = result.products;
        productKeeper[searchName] = [];
        products.forEach(product => {
            if (product.title.length && product.price < maxPrice) {
                productKeeper[searchName].push(product);
            }
        });

        totalProducts += productKeeper[searchName].length;
    });

    if (totalProducts) {
        let transporter = nodemailer.createTransport(config.transport);
        let mailOptions = {
            from: config.from,
            to: config.to,
            subject: 'GPU Found! - ' + totalProducts + ' AVAILABLE!',
            text: JSON.stringify(productKeeper, false, 4),
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message %s sent: %s', info.messageId, info.response);
        });
    }
});
