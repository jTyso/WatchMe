//jshint esversion:6
'use strict';

var util = require('util');

var envvar = require('envvar');
var express = require('express');
var bodyParser = require('body-parser');
var moment = require('moment');
var plaid = require('plaid');

//environment variables, to be declared at server runtime.
var APP_PORT = envvar.number('APP_PORT', 8000);
var PLAID_CLIENT_ID = envvar.string('PLAID_CLIENT_ID');
var PLAID_SECRET = envvar.string('PLAID_SECRET');
var PLAID_PUBLIC_KEY = envvar.string('PLAID_PUBLIC_KEY');
var PLAID_ENV = envvar.string('PLAID_ENV', 'sandbox');

// We store the access_token in memory
// In production, store it in a secure persistent data store
var ACCESS_TOKEN = null;
var PUBLIC_TOKEN = null;
var ITEM_ID = null;

// Initialize the Plaid client
var client = new plaid.Client(
    PLAID_CLIENT_ID,
    PLAID_SECRET,
    PLAID_PUBLIC_KEY,
    plaid.environments[PLAID_ENV], { version: '2018-05-22' }
);

var app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());

app.get('/', function(request, response, next) {
    response.render('index.ejs', {
        PLAID_PUBLIC_KEY: PLAID_PUBLIC_KEY,
        PLAID_ENV: PLAID_ENV,
    });
});

app.post('/get_access_token', function(request, response, next) {
    PUBLIC_TOKEN = request.body.public_token;
    client.exchangePublicToken(PUBLIC_TOKEN, function(error,
        tokenResponse) {
        if (error != null) {
            var msg = 'Could not exchange public_token!';
            console.log(msg + '\n' + JSON.stringify(error));
            return response.json({
                error: msg
            });
        }
        ACCESS_TOKEN = tokenResponse.access_token;
        ITEM_ID = tokenResponse.item_id;
        prettyPrintResponse(tokenResponse);
        response.json({
            access_token: ACCESS_TOKEN,
            item_id: ITEM_ID,
            error: false
        });
    });
});

// Retrieve ACH or EFT Auth data for an Item's accounts
// https://plaid.com/docs/#auth
app.get('/auth', function(request, response, next) {
    client.getAuth(ACCESS_TOKEN, function(error, authResponse) {
        if (error != null) {
            prettyPrintResponse(error);
            return response.json({
                error: error,
            });
        }
        prettyPrintResponse(authResponse);
        response.json({ error: null, auth: authResponse });
    });
});

// Retrieve Transactions for an Item
// https://plaid.com/docs/#transactions
app.get('/transactions', function(request, response, next) {
    // Pull transactions for the Item for the last 30 days
    var startDate = moment().subtract(30,
        'days').format('YYYY-MM-DD');
    var endDate = moment().format('YYYY-MM-DD');
    var balanceInAccount;
    let res = client.getTransactions(ACCESS_TOKEN, startDate, endDate, {
        count: 250,
        offset: 0,
    }, function(error, transactionsResponse) {
        if (error != null) {
            prettyPrintResponse(error);
            return response.json({
                error: error
            });
        } else {
            prettyPrintResponse(transactionsResponse);
            response.json({
                error: false,
                transactions: transactionsResponse
            });
            // balanceInAccount = transactionsResponse.accounts;
            // console.log("YEYEYEYEY");
            // console.log("YEYEYEYEY");
            // console.log("YEYEYEYEY");
            // console.log("YEYEYEYEY");
            // console.log("YEYEYEYEY");
            // console.log("YEYEYEYEY");
            // console.log(balanceInAccount[1]);
            //response.render('balance', { balance: balanceInAccount[1].balances.available });
        }
    });

});

var server = app.listen(APP_PORT, function() {
    console.log('plaid-quickstart server listening on port ' + APP_PORT);
});

var prettyPrintResponse = response => {
    console.log(util.inspect(response, { colors: true, depth: 4 }));
};