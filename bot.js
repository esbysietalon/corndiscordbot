const Discord = require('discord.js');
const { Client, RichEmbed } = require('discord.js');

const MAP_HEIGHT = 10;
const MAP_WIDTH = 10;

var map = [];
var underlyingMap = [];

var client = new Discord.Client();

var prefix = '>';

var namingPrompt = '';
var additionPrompt = 0;
var translationPrompt = '';
var countingPrompt = 0;

var globalTimer = 0;
var timerDone = true;

var runningTimers = []
var members = [];
var market = [];
var exchange = [];
var industries = [];
var workSchemes = ['addition', 'naming', 'translation', 'counting'];
var namingItems = ['eggplant','tomato','pineapple','peach','corn','lemon','apple','cherries','watermelon','grapes'];

var events = [];

var defaultChannel = -1;
var currentAuction = -1;
var currentBid = -1;

var takenCorpIcons = [];

class Event{
    constructor(description, industry, yieldFactor, priceFactor){
        this.description = description;
        this.industry = industry;
        this.yieldFactor = yieldFactor;
        this.priceFactor = priceFactor;
    }
    set description(str){
        this._description = str;
    }
    get description(){
        return this._description;
    }
    set industry(str){
        this._industry = str;
    }
    get industry(){
        return this._industry;
    }
    set yieldFactor(num){
        this._yieldFactor = num;
    }
    get yieldFactor(){
        return this._yieldFactor;
    }
    set priceFactor(num){
        this._priceFactor = num;
    }
    get priceFactor(){
        return this._priceFactor;
    }
}
class TimerSlot{
    constructor(delay, channelID, message, messager){
        this.time = delay;
        this.feed = channelID;
        this.message = message;
        this.messager = messager;
    }
    set time(num){
        this._time = num;
    }
    get time(){
        return this._time;
    }
    set feed(id){
        this._feed = id;
    }
    get feed(){
        return this._feed;
    }
    set message(msg){
        this._message = msg;
    }
    get message(){
        return this._message;
    }
    set messager(user){
        this._messager = user;
    }
    get messager(){
        return this._messager;
    }
}
function runEvents(){
    var j;
    for(j = 0; j < industries.length; j++){
        industries[j].priceFactor = 0;
        industries[j].yieldFactor = 0;
    }
    //console.log(events.length + ' is how big events is!');
    for(j = 0; j < events.length; j++){
        var i;
        for(i = 0; i < industries.length; i++){
            //console.log(industries[i].workScheme + ' vs ' + events[i].industry);
            if(industries[i].workScheme === events[j].industry){
                //console.log('Events are happening! ' + events[i].effectFactor);
                industries[i].priceFactor += events[j].priceFactor;
                industries[i].yieldFactor += events[j].yieldFactor;
            }
        }
    }
    events = [];
    for(j = 0; j < 10; j++){
        var randIndustry = Math.floor(Math.random() * workSchemes.length);
        var factor = Math.trunc(Math.random() * 10 - Math.random() * 10) / 100;
        var industry = 'temp';
        var effect = 'price';
        switch(workSchemes[randIndustry]){
            case 'addition':
                industry = 'defense';
                break;
            case 'translation':
                industry = 'bureaucracy';
                break;
            case 'counting':
                industry = 'manufacturing';
                break;
            case 'naming':
                industry = 'agriculture';
                break;
        }
        if(Math.random() > 0.5){
            effect = 'yield';
        }

        var effectDesc = '';
        var posiNega = 'a downswing';
        if(Math.abs(factor) < 0.2){
            effectDesc += 'mildly';
        }
        if(Math.abs(factor) > 0.7){
            effectDesc += 'strongly';
        }
        if(factor > 0){
            posiNega = 'an upswing';
        }

        //console.log('Pushing event with industry of ' + workSchemes[randIndustry]);
        var desc = 'The ' + effect + ' of the ' + industry +  ' industry will be affected ' + effectDesc + ', experiencing ' + posiNega + '.';
        if(effect === 'price'){
            events.push(new Event(desc, workSchemes[randIndustry], 0, factor));
        }else{
            events.push(new Event(desc, workSchemes[randIndustry], factor, 0));
        }
    }
}
function insertTimer(delay, channelID, message, messager){
    var i;
    for(i = 0; i < runningTimers.length; i++){
        if(runningTimers[i].messager.memberName === messager.memberName){
            runningTimers[i] = new TimerSlot(delay, channelID, message, messager);
            return;
        }
    }
    runningTimers.push(new TimerSlot(delay, channelID, message, messager));
}




class ItemSlot {
    constructor(name, price, number){
        this.name = name;
        this.price = price;
        this.basePrice = price;
        this.num = number;
        this.description = '';
    }
    set industry(str){
        this._industry = str;
    }
    get industry(){
        return this._industry;
    }
    set basePrice(num){
        this._basePrice = num;
    }
    get basePrice(){
        return this._basePrice;
    }
    set description(str){
        this._description = str;
    }
    get description(){
        return this._description;
    }
    get price(){
        return this._price;
    }
    set price(dec){
        this._price = dec;
    }
    get name(){
        return this._name;
    }
    set name(str){
        this._name = str;
    }
    get num(){
        return this._num;
    }
    set num(uint){
        this._num = uint;
    }
}
class Industry{
    constructor(name, workScheme, price, product){
        this.name = name;
        this.workScheme = workScheme;
        this.demandIndex = 1.00;
        this.productStock = 100;
        this.basePrice = 100;
        this.productPrice = price;
        this.product = product;
        this.priceFactor = 0.00;
        this.yieldFactor = 0.00;
        this.workYield = Math.ceil(1500/this.productPrice);
        this.parentCorp = '';
        this.profit = 0;
    }
    set profit(num){
        this._profit = num;
    }
    get profit(){
        return this._profit;
    }
    set parentCorp(corp){
        this._parentCorp = corp;
    }
    get parentCorp(){
        return this._parentCorp;
    }
    get overhead(){
        if(this.parentCorp === ''){
            return 1500 * (1.00 + Math.max(-0.99, this.priceFactor));
        }else{
            return Math.trunc(100 * 600 * 0.75 * this.productPrice * this.parentCorp.territory * (1.00 + Math.max(-0.99, this.priceFactor))) / 100;
        }
    }
    set workYield(num){
        this._workYield = num;
    }
    get workYield(){
        return this._workYield;
    }
    set priceFactor(flt){
        this._priceFactor = flt;
    }
    get priceFactor(){
        return this._priceFactor;
    }
    set yieldFactor(flt){
        this._yieldFactor = flt;
    }
    get yieldFactor(){
        return this._yieldFactor;
    }
    set productIndex(num){
        this._productIndex = num;
    }
    get productIndex(){
        return this._productIndex;
    }
    set stockIndex(num){
        this._stockIndex = num;
    }
    get stockIndex(){
        return this._stockIndex;
    }
    set name(str){
        this._name = str;
    }
    get name(){
        return this._name;
    }
    set workScheme(str){
        this._workScheme = str;
    }
    get workScheme(){
        return this._workScheme;
    }
    set demandIndex(num){
        this._demandIndex = num;
    }
    get demandIndex(){
        return this._demandIndex;
    }
    set productPrice(dec){
        this._productPrice = dec;
    }
    get productPrice(){
        return this._productPrice;
    }
    set productStock(num){
        this._productStock = num;
    }
    get productStock(){
        return this._productStock;
    }
    set basePrice(dec){
        this._basePrice = dec;
    }
    get basePrice(){
        return this._basePrice;
    }
    get index(){
        //console.log(this._stockFactor);
        return this._basePrice * this._demandIndex * (1.00 + Math.max(0, 0.01 * (1.00 + this.priceFactor) / (1.00 + this.yieldFactor)));
    }
    set product(str){
        this._product = str;
    }
    get product(){
        return this._product;
    }
    get price(){
        return this._productPrice * this._demandIndex;
    }
    set wage(num){
        this._wage = num;
    }
    get wage(){
        return this._wage;
    }
}
function workFor(industry){
    if(isNaN(industry) === false){
        if(parseInt(industry) - 1 < 0 || parseInt(industry) - 1 >= industries.length){
            return -1;
        }
        return parseInt(industry) - 1;
    }
    var i;
    for(i = 0; i < industries.length; i++){
        if(industry.toLowerCase() === industries[i].name.toLowerCase()){
            return i;
        }
    }
    return -1;
}
function createIndustry(name, workScheme, price, product){
    var newIndustry = new Industry(name, workScheme, price, product);
    newIndustry.wage = 10;
    industries.push(newIndustry);
}
class Corp {
    constructor(icon, name, industry){
        this.name = name;
        this.icon = icon;
        this.industry = industry;
        this.territory = 0;
    }
    set territory(num){
        this._territory = num;
    }
    get territory(){
        return this._territory;
    }
    set name(str){
        this._name = str;
    }
    get name(){
        return this._name;
    }
    set icon(ico){
        this._icon = ico;
    }
    get icon(){
        return this._icon;
    }
    set industry(str){
        this._industry = str;
    }
    get industry(){
        return this._industry;
    }
}
class Member {
    constructor(name){
        this.memberName = name;
        this.balance = 2000000;
        this.inventory = [];
        this.inputState = 0;
        this.hasTimer = false;
        this.skillSet = [1,1,1,1];
        this.skillExp = [0,0,0,0];
        this.corpIcon = '';
    }
    set skillSet(arr){
        this._skillSet = arr;
    }
    get skillSet(){
        return this._skillSet;
    }
    set skillExp(arr){
        this._skillExp = arr;
    }
    get skillExp(){
        return this._skillExp;
    }
    set inputState(num){
        this._inputState = num;
    }
    get inputState(){
        return this._inputState;
    }
    get memberName(){
        return this._memberName;
    }
    set memberName(name){
        this._memberName = name;
    }
    get balance(){
        return this._balance;
    }
    set balance(num){
        this._balance = num;
    }
    get inventory(){
        return this._inventory;
    }
    set inventory(arr){
        this._inventory = arr;
    }
    get jobAt(){
        return this._jobAt;
    }
    set jobAt(job){
        this._jobAt = job;
    }
    get corpIcon(){
        return this._corpIcon;
    }
    set corpIcon(icon){
        this._corpIcon = icon;
    }
    get corp(){
        return this._corp;
    }
    set corp(inc){
        this._corp = inc;
    }
}
function createItem(name, price, num, description){
    var newItem = new ItemSlot(name, price, num);
    newItem.description = description;
    market.push(newItem);
}
function createStock(name, price, num, description){
    var newItem = new ItemSlot(name, price, num);
    newItem.description = description;
    exchange.push(newItem);
}
function addItem(user, item, amount){
    var member;
    var i;
    for(i = 0; i < members.length; i++){
        if(members[i].memberName === user){
            member = members[i];
        }
    }
    if(member === undefined){
        return -1;
    }
    var inMarket = false;
    var inExchange = false;
    var marketItem;
    //console.log(item);
    if(isNaN(item) === true){

        for(i = 0; i < market.length; i++){
            //console.log(market[i].name);
            if(market[i].name.toLowerCase() === item.toLowerCase()){
                inMarket = true;
                marketItem = market[i];
                break;
            }
        }
        for(i = 0; i < exchange.length; i++){
            if(exchange[i].name.toLowerCase() === item.toLowerCase()){
                inExchange = true;
                inMarket = true;
                marketItem = exchange[i];
                break;
            }
        }
    }else{
        if(parseInt(item) <= 0 || parseInt(item) > market.length + exchange.length){
            inMarket = false;
        }else{
            inMarket = true;
            if(parseInt(item) >= market.length + 1){
                inExchange = true;
                item -= market.length;
                marketItem = exchange[item - 1];
            }else{
                marketItem = market[item - 1];
            }
        }

    }
    if(inMarket === false || marketItem.num < amount){
        return -2;
    }
    if(marketItem.price * amount > member.balance){
        return -3;
    }
    var marketIndustry = marketItem.industry;
    for(i = 0; i < member.inventory.length; i++){
        if(member.inventory[i].name === item){
            member.inventory[i].num += amount;
            member.balance = member.balance - marketItem.price * amount;
            marketItem.industry.profit += marketItem.price * amount;
            if(inExchange === false){
                marketIndustry.demandIndex += 0.01 * amount;
                marketItem.price = Math.round(marketItem.price * 10) / 10;
            }
            marketItem.num -= amount;
            return 0;
        }
    }
    member.inventory.push(new ItemSlot(marketItem.name, marketItem.price, amount));
    member.balance = member.balance - marketItem.price * amount;
    marketItem.num -= amount;
    if(inExchange === false){
        marketIndustry.demandIndex += 0.01 * amount;
        marketItem.price = Math.round(marketItem.price * 10) / 10;
    }
    return 0;
}
function register(user){
    var i;
    for(i = 0; i < members.length; i++){
        if(members[i].memberName === user){
            return false;
        }
    }
    var newMember = new Member(user);
    members.push(newMember);
    return true;
}
function listMarket(){
    var i;
    var output = '';
    for(i = 0; i < market.length; i++){
        output += ''+(i + 1) + '.\t**' + market[i].name + '**\n$' + market[i].price + '\n\t' + market[i].description + '.\n\t' + market[i].num + ' left in stock.\n\n';
    }
    for(i = 0; i < exchange.length; i++){
        output += ''+(i + 1 + market.length) + '.**\t' + exchange[i].name + '**\n$' + exchange[i].price + '\n\t' + exchange[i].description + '.\n\t' + exchange[i].num + ' left in stock.\n\n';
    }
    output += '';
    return output;
}

function initializeEconomy(){
    var i;
    createIndustry('Gun Corp', 'addition', 15, 'Gun');
    createIndustry('The Potato Farm', 'naming', 2, 'Potato');
    createIndustry('Manufacturing Inc', 'counting', 6, 'Gear');
    createIndustry('PaperHouse', 'translation', 5, 'Paperwork');
    for(i = 0; i < industries.length; i++){
        var name = 'Stock - '+industries[i].name;
        var price = industries[i].index;
        var description = 'A share in ' + industries[i].name;
        createStock(name, price, 100, description);
        industries[i].stockIndex = exchange.length - 1;
        exchange[exchange.length - 1].industry = industries[i];
    }
    for(i = 0; i < industries.length; i++){
        var name = industries[i].product;
        var price = industries[i].price;
        var description = 'The main product of ' + industries[i].name;
        createItem(name, price, 1000, description);
        industries[i].productIndex = market.length - 1;
        if(industries[i].product === 'Paperwork'){
            market[market.length - 1].num = 1000000;
        }
        market[market.length - 1].industry = industries[i];
    }
    events = [];
    for(j = 0; j < 10; j++){
        var randIndustry = Math.floor(Math.random() * workSchemes.length);
        var factor = Math.trunc(Math.random() * 10 - Math.random() * 10) / 100;
        var industry = 'temp';
        var effect = 'price';
        switch(workSchemes[randIndustry]){
            case 'addition':
                industry = 'defense';
                break;
            case 'translation':
                industry = 'bureaucracy';
                break;
            case 'counting':
                industry = 'manufacturing';
                break;
            case 'naming':
                industry = 'agriculture';
                break;
        }
        if(Math.random() > 0.5){
            effect = 'yield';
        }

        var effectDesc = '';
        var posiNega = 'a downswing';
        if(Math.abs(factor) < 0.2){
            effectDesc += 'mildly';
        }
        if(Math.abs(factor) > 0.7){
            effectDesc += 'strongly';
        }
        if(factor > 0){
            posiNega = 'an upswing';
        }

        //console.log('Pushing event with industry of ' + workSchemes[randIndustry]);
        var desc = 'The ' + effect + ' of the ' + industry +  ' industry will be affected ' + effectDesc + ', experiencing ' + posiNega + '.';
        if(effect === 'price'){
            events.push(new Event(desc, workSchemes[randIndustry], 0, factor));
        }else{
            events.push(new Event(desc, workSchemes[randIndustry], factor, 0));
        }
    }
    //console.log('Again, Industry is ' + events[events.length - 1].industry);
    //console.log('Events is ' + events.length + ' big!');
    runEvents();
    updatePrices();
}

function welcomeBot(channelID){
    defaultChannel = channelID;
    //register(client.user.username);
    initializeEconomy();
    insertTimer(7200000, defaultChannel, 'Market Forces - Price Decay!', new Member('Announcements'));
    defaultChannel.send(client.user.username + ' activated!');
    initializeMap();
}
function initializeMap(){
    var y, x;
    for(y = 0; y < MAP_HEIGHT; y++){
        for(x = 0; x < MAP_WIDTH; x++){
            map.push(':white_small_square:');
            underlyingMap.push(-1);
        }
    }
}
function updatePrices(){
    var i;
    for(i = 0; i < industries.length; i++){
        //console.log(industries[i]);
        //market[i].price = industries[i].price;
        market[i].price = Math.trunc(industries[i].price * 100) / 100;
        if(i < 4){
            console.log('workyield: ' + industries[i].workYield + ' yieldFactor: ' + industries[i].yieldFactor);
            console.log(industries[i].price * industries[i].workYield * (1.00 + Math.max(-0.99, industries[i].yieldFactor)));
            console.log(industries[i].overhead);
            if(industries[i].overhead > industries[i].price * industries[i].workYield * (1.00 + Math.max(-0.99, industries[i].yieldFactor))){
                market[i].price = Math.trunc(100 * industries[i].overhead / (industries[i].workYield * (1.00 + Math.max(-0.99, industries[i].yieldFactor)))) / 100;
                console.log('Government intervention.');
            }
        }
    }
    for(i = 0; i < industries.length; i++){
        //exchange[i].price = industries[i].index;

        //console.log(industries[i].index);
        exchange[i].price = Math.trunc(industries[i].index * 100) / 100;
    }
    for(i = 0; i < 4; i++){
        //industries[i].wage = industries[i].price / 10.0;
        industries[i].wage = Math.trunc(100 * (market[i].price * industries[i].workYield  * (1.00 + Math.max(-0.99, industries[i].yieldFactor)) - industries[i].overhead)/10) / 100;
    }
}
function getUpdateMessage(member=''){
    var output = '';
    var i;
    if(members.length === 0){
        return 'No members currently registered. Please register using the '+prefix+'register command.'
    }
    members = members.sort(function(a, b){return b.balance - a.balance});
    output += '';
    if(member != ''){
        member.balance = Math.trunc(member.balance * 100) / 100;
        output += '**'+member.memberName + '** .... $' + member.balance + '\n\t\n';
        var j;
        for(j = 0; j < member.inventory.length; j++){
            if(member.inventory[j].num > 0){
                output += ''+(j+1) + '. '+member.inventory[j].name+' | '+member.inventory[j].num+'\n\n';
            }
        }
    }else{
        for(i = 0; i < members.length; i++){
            output += (i+1) + '. **'+members[i].memberName + '** .... $' + members[i].balance + '\n\t\n';
            var j;
            /*for(j = 0; j < members[i].inventory.length; j++){
				if(members[i].inventory[j].num > 0){
					output += '        '+(j+1) + '. '+members[i].inventory[j].name+' | '+members[i].inventory[j].num+'\n';
				}
			}*/
        }
    }
    output += '';

    return output;
}
function getHelpMessage(){
    return '\n\nhelp\t-\tshows list of commands with a brief description.\n\nupdate\t-\treturns an update of the user\'s account.\n\nwhoami\t-\twho are you?\n\nregister\t-\tregisters a user into the system.\n\nsetprefix\t-\tchanges the command prefix.\n\nbuy\t-\tadds an item to the member\'s inventory\n\nmarket\t-\tlist the items for sale\n\nwork\t-\twork for money\n\nauction\t-\tstart an auction\n\nbid\t-\tbid for the current auction\n';
}
client.on('ready', () => {
    console.log('Connected! Discord Tycoon is ready.');
});
setInterval(function(){runEvents()}, 3600000);
setInterval(function(){
    var i;
    for(i = 0; i < runningTimers.length; i++){
        if(runningTimers[i].time > 0){
            if(runningTimers[i].time === 1){
                runningTimers[i].feed.send(runningTimers[i].message);
            }
            runningTimers[i].time--;
        }else{
            if(runningTimers[i].messager.memberName === client.user.username){
                if(runningTimers[i].message === 'Market Forces - Price Decay!'){
                    var j;
                    for(j = 0; j <industries.length; j++){
                        industries[j].profit -= industries[j].overhead;
                    }
                    for(j = 0; j < members.length; j++){
                        var k;
                        for(k = 0; k < members[j].inventory.length; k++){
                            if(members[j].inventory[k].name.length > 6){
                                if(members[j].inventory[k].name.substring(0, 7) === 'Stock-'){
                                    //dividend payout
                                    members[j].balance += members[j].inventory[k].num / 100 * (Math.max(0, members[j].inventory[k].industry.profit));

                                }
                            }
                        }
                    }
                    for(j = 0; j < industries.length; j++){
                        var k;
                        var marketItem;
                        for(k = 0; k < market.length; k++){
                            if(market[k].name === industries[j].product){
                                marketItem = market[k];
                            }
                        }
                        if(industries[j].demandIndex > 0.01 && marketItem.num > 1){
                            industries[j].demandIndex -= Math.trunc(( ((industries[j].demandIndex - (industries[j].demandIndex) / marketItem.num)) / 4 * 100)) / 100;
                            industries[j].demandIndex = Math.max(0.01, industries[j].demandIndex);
                        }
                        industries[j].profit = 0;
                    }

                }
            }
            if(runningTimers[i].time === 0){
                runningTimers[i].time--;
                runningTimers[i].messager.inputState = 0;
            }
        }
    }
}, 1000);
function setCurrentAuction(user, item, amount, bid){
    currentAuction = {
        'seller': user,
        'item': item,
        'amount': amount,
        'currBid': bid
    };
}
function checkCurrentAuction(){
    return currentAuction;
}
function checkCurrentBid(){
    return currentBid;
}
client.on('message', msg => {
    var message = msg.content;
    var channelID = msg.channel;
    var user = msg.author.username;
    var userID = msg.author.id;
    // Our client needs to know if it will execute a command
    // It will listen for messages that will start with `!`

    //var user = msg.author.avatarURL;
    //console.log(user);
    if(msg.author.bot === true){
        return;
    }
    var tempCmd = message.split(' ')[0];
    if(tempCmd === prefix + 'welcome'){
        if(defaultChannel === -1){
            console.log('activating client!');
            welcomeBot(channelID);
            if(message.split(' ').length > 1){
                prefix = message.split(' ')[1];
            }
            return;
        }else{
            channelID.send('Bot already activated!');
            return;
        }
    }
    if(defaultChannel === -1){

        console.log('client not yet activated!');
        return;
    }
    if(client.user.id === userID){
        return;
    }
    var messagerIndex;
    var unregistered = true;
    var k;
    if(message === prefix + 'register' || message === prefix + 'hello'){				
        if(register(user) === true){
            channelID.send('Registering ' + user + ', please see ' + prefix + 'help.');
        }else{
            channelID.send('Already registered ' + user + '!');
        }
    }
    for(k = 0; k < members.length; k++){
        if(user === members[k].memberName){
            messagerIndex = k;
            unregistered = false;
        }
    }
    if(unregistered === true){
        if(register(user) === true){
            channelID.send('Registering ' + user + ', please see ' + prefix + 'help.');
            messagerIndex = members.length - 1;
        }
    }
    updatePrices();
    //console.log(user + ' is at state ' + members[messagerIndex].inputState);
    var args = message.split(' ');
    var tempArgs = [];
    var preprocessing = true;
    var t_index = 0;
    var index = 0;
    var join = false;
    var argItem = '';
    while(preprocessing === true){
        argItem += args[index];
        tempArgs[t_index] = argItem;
        if(args[index].substring(0, 1) === '"' || args[index].substring(args[index].length - 1, args[index].length) === '"'){
            join = !join;
        }
        if(join === false){
            t_index++;
            argItem = '';
        }else{
            argItem += ' ';
        }
        index++;
        if(index === args.length){
            preprocessing = false;
        }
    }
    args = tempArgs;
    for(var i = 0; i < args.length; i++){
        if(args[i].substring(0, 1) === '"'){
            args[i] = args[i].substring(1);
        }
        if(args[i].substring(args[i].length - 1, args[i].length) === '"'){
            args[i] = args[i].substring(0, args[i].length - 1);
        }
    }
    if(members[messagerIndex].inputState != 0){
        //var cmd = args[0];
        var cmd = args[0];
        if(cmd === prefix + 'cancel' || cmd === 'cancel'){
            channelID.send('Canceling action.');
            members[messagerIndex].inputState = 0;	
            var k;
            for(k = 0; k < runningTimers.length; k++){
                if(runningTimers[k].messager.memberName === members[messagerIndex].memberName){
                    runningTimers[k].time = -2;
                    break;
                }
            }
            return;

        }
        switch(members[messagerIndex].inputState){
                //console.log(members[messagerIndex].inputState);
            case 1:

                //awaiting industry from work command
                var attempt = workFor(cmd);
                if(attempt >= 0){
                    //chose real industry, set up work prompt
                    var industryItem = industries[attempt];
                    members[messagerIndex].jobAt = industryItem;
                    switch(industryItem.workScheme){
                        case 'addition':
                            var randAddendOne = Math.floor(Math.random() * 899) + 100;

                            var randAddendTwo = Math.floor(Math.random() * 899) + 100;

                            additionPrompt = randAddendOne + randAddendTwo;

                            var equation = randAddendOne + ' + ' + randAddendTwo;

                            channelID.send('What is ' + equation + ' ?');
                            members[messagerIndex].inputState = 400;


                            insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            break;
                        case 'counting':
                            var randNum = Math.floor(Math.random() * 19) + 5;
                            var dots = '';
                            var i;
                            countingPrompt = randNum;
                            for(i = 0; i < randNum; i++){
                                dots += '\t.';
                            }
                            channelID.send('How many dots are there?\n' + dots);
                            members[messagerIndex].inputState = 300;

                            insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            break;
                        case 'translation':
                            var validChars = 'abcdefghijklmnopqrstuv';
                            var randLen = Math.floor(Math.random() * 8) + 1;
                            var i;

                            translationPrompt = '';

                            for(i = 0; i < randLen; i++){
                                translationPrompt += validChars.charAt(Math.floor(Math.random() * validChars.length));
                            }

                            var tempArr = translationPrompt.split("");
                            tempArr = tempArr.reverse();
                            var translation = tempArr.join("");

                            channelID.send('What is *' + translation + '* in reverse?');
                            members[messagerIndex].inputState = 200;


                            insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            break;
                        case 'naming':

                            var randIndex = Math.floor(Math.random() * namingItems.length);
                            namingPrompt = namingItems[randIndex];
                            var j;
                            for(j = 0; j < 4; j++){
                                randIndex = Math.floor(Math.random() * namingItems.length);
                                namingPrompt += ': :' + namingItems[randIndex];
                            }
                            channelID.send('Name the items: :' + namingPrompt + ':');
                            members[messagerIndex].inputState = 100;



                            insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            break;
                    }
                }else{
                    channelID.send('That business doesn\'t exist! Please pick a real business.');
                }
                break;
            case 100:
                //awaiting input for naming work prompt
                var j;
                for(j = 0; j < runningTimers.length; j++){
                    if(runningTimers[j].messager.memberName === members[messagerIndex].memberName){
                        if(runningTimers[j].time > 0){
                            //console.log(namingPrompt.split(':').join('').split(' ').join('-'));
                            if(namingPrompt.split(':').join('') === cmd){
                                members[messagerIndex].skillExp[3] += 10 + members[messagerIndex].skillSet[3];
                                if(members[messagerIndex].skillExp[3] >= 150){
                                    members[messagerIndex].skillExp[3] -= 150;
                                    members[messagerIndex].skillSet[3]++;
                                    channelID.send('You\'ve become more familiar with the Agriculture industry. Your skill in this industry increases to level ' + members[messagerIndex].skillSet[3] + '!');
                                }
                                var pay = (members[messagerIndex].jobAt.wage * (members[messagerIndex].skillSet[3]));

                                members[messagerIndex].balance += pay;
                                members[messagerIndex].jobAt.profit -= pay;
                                channelID.send('Nice job! You\'re paid $' + pay + ' for your hard work. (' + members[messagerIndex].skillExp[3] + '/150 AGR XP)');

                                var wyield = Math.ceil(members[messagerIndex].jobAt.workYield * (1.00 + 0.01 * members[messagerIndex].skillSet[3]) * (1.00 + Math.max(-0.99, members[messagerIndex].jobAt.yieldFactor)));

                                market[members[messagerIndex].jobAt.productIndex].num += wyield;

                                var randIndex = Math.floor(Math.random() * namingItems.length);
                                namingPrompt = ':'+namingItems[randIndex];
                                var k;
                                for(k = 0; k < 4; k++){
                                    randIndex = Math.floor(Math.random() * namingItems.length);
                                    namingPrompt += ': :' + namingItems[randIndex];
                                }
                                namingPrompt += ':';
                                channelID.send('Name the items: ' + namingPrompt);
                                members[messagerIndex].inputState = 100;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            }else{
                                runningTimers[j].feed.send('You\'ve flubbed the job. Try again:');

                                var randIndex = Math.floor(Math.random() * namingItems.length);
                                namingPrompt = ':'+namingItems[randIndex];
                                var k;
                                for(k = 0; k < 4; k++){
                                    randIndex = Math.floor(Math.random() * namingItems.length);
                                    namingPrompt += ': :' + namingItems[randIndex];
                                }
                                namingPrompt += ':';
                                channelID.send('Name the items (joined by a \'-\'): ' + namingPrompt);
                                members[messagerIndex].inputState = 100;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            }
                        }
                    }
                }
                break;
            case 200:
                //awaiting input for translation work prompt
                var j;
                for(j = 0; j < runningTimers.length; j++){
                    if(runningTimers[j].messager.memberName === members[messagerIndex].memberName){
                        if(runningTimers[j].time > 0){
                            if(translationPrompt === cmd){
                                members[messagerIndex].skillExp[2] += 10 + members[messagerIndex].skillSet[2];
                                if(members[messagerIndex].skillExp[2] >= 150){
                                    members[messagerIndex].skillExp[2] -= 150;
                                    members[messagerIndex].skillSet[2]++;
                                    channelID.send('You\'ve become more familiar with the Bureaucracy industry. Your skill in this industry increases to level ' + members[messagerIndex].skillSet[2] + '!');
                                }
                                var pay = (members[messagerIndex].jobAt.wage * (members[messagerIndex].skillSet[2]));
                                members[messagerIndex].balance += pay;
                                members[messagerIndex].jobAt.profit -= pay;
                                runningTimers[j].feed.send('Nice job! You\'re paid $' + pay + ' for your hard work. (' + members[messagerIndex].skillExp[2] + '/150 BUR XP)');

                                var wyield = Math.ceil(members[messagerIndex].jobAt.workYield * (1.00 + 0.01 * members[messagerIndex].skillSet[2] * (1.00 + Math.max(-0.99, members[messagerIndex].jobAt.yieldFactor))));

                                market[members[messagerIndex].jobAt.productIndex].num += wyield;

                                var validChars = 'abcdefghijklmnopqrstuv';
                                var randLen = Math.floor(Math.random() * 8) + 5;
                                var i;

                                translationPrompt = '';

                                for(i = 0; i < randLen; i++){
                                    translationPrompt += validChars.charAt(Math.floor(Math.random() * validChars.length));
                                }

                                var tempArr = translationPrompt.split("");
                                tempArr = tempArr.reverse();
                                var translation = tempArr.join("");

                                channelID.send('What is *' + translation + '* in reverse?');
                                members[messagerIndex].inputState = 200;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);

                            }else{
                                runningTimers[j].feed.send('You\'ve flubbed the job. Try again:');

                                var validChars = 'abcdefghijklmnopqrstuv';
                                var randLen = Math.floor(Math.random() * 8) + 5;
                                var i;

                                translationPrompt = '';

                                for(i = 0; i < randLen; i++){
                                    translationPrompt += validChars.charAt(Math.floor(Math.random() * validChars.length));
                                }

                                var tempArr = translationPrompt.split("");
                                tempArr = tempArr.reverse();
                                var translation = tempArr.join("");

                                channelID.send('What is *' + translation + '* in reverse?');
                                members[messagerIndex].inputState = 200;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            }
                        }
                    }
                }
                break;
            case 300:
                //counting
                var j;
                for(j = 0; j < runningTimers.length; j++){
                    if(runningTimers[j].messager.memberName === members[messagerIndex].memberName){
                        if(runningTimers[j].time > 0){
                            if(countingPrompt === cmd){
                                members[messagerIndex].skillExp[1] += 10 + members[messagerIndex].skillSet[1];
                                if(members[messagerIndex].skillExp[1] >= 150){
                                    members[messagerIndex].skillExp[1] -= 150;
                                    members[messagerIndex].skillSet[1]++;
                                    channelID.send('You\'ve become more familiar with the Manufacturing industry. Your skill in this industry increases to level ' + members[messagerIndex].skillSet[1] + '!');
                                }
                                var pay = (members[messagerIndex].jobAt.wage * (members[messagerIndex].skillSet[1]));
                                members[messagerIndex].balance += pay;
                                members[messagerIndex].jobAt.profit -= pay;
                                runningTimers[j].feed.send('Nice job! You\'re paid $' + pay + ' for your hard work. (' + members[messagerIndex].skillExp[1] + '/150 MFG XP)');

                                var wyield = Math.ceil(members[messagerIndex].jobAt.workYield * (1.00 + 0.01 * members[messagerIndex].skillSet[1]) * (1.00 + Math.max(-0.99, members[messagerIndex].jobAt.yieldFactor)));

                                market[members[messagerIndex].jobAt.productIndex].num += wyield;

                                var randNum = Math.floor(Math.random() * 19) + 5;
                                var dots = '';
                                var i;
                                countingPrompt = randNum;
                                for(i = 0; i < randNum; i++){
                                    dots += '\t.';
                                }
                                channelID.send('How many dots are there?\n' + dots);
                                members[messagerIndex].inputState = 300;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);

                            }else{
                                runningTimers[j].feed.send('You\'ve flubbed the job. Try again:');

                                var randNum = Math.floor(Math.random() * 19) + 5;
                                var dots = '';
                                var i;
                                countingPrompt = randNum;
                                for(i = 0; i < randNum; i++){
                                    dots += '\t.';
                                }
                                channelID.send('How many dots are there?\n' + dots);
                                members[messagerIndex].inputState = 300;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            }
                        }
                    }
                }
                break;
            case 400:
                //addition
                var j;
                for(j = 0; j < runningTimers.length; j++){
                    if(runningTimers[j].messager.memberName === members[messagerIndex].memberName){
                        if(runningTimers[j].time > 0){
                            if(additionPrompt === cmd){
                                members[messagerIndex].skillExp[0] += 10 + members[messagerIndex].skillSet[0];
                                if(members[messagerIndex].skillExp[0] >= 150){
                                    members[messagerIndex].skillExp[0] -= 150;
                                    members[messagerIndex].skillSet[0]++;
                                    channelID.send('You\'ve become more familiar with the Defense industry. Your skill in this industry increases to level ' + members[messagerIndex].skillSet[0] + '!');
                                }
                                var pay = (members[messagerIndex].jobAt.wage * (members[messagerIndex].skillSet[0]));
                                members[messagerIndex].balance += pay;
                                members[messagerIndex].jobAt.profit -= pay;
                                runningTimers[j].feed.send('Nice job! You\'re paid $' + pay + ' for your hard work. (' + members[messagerIndex].skillExp[0] + '/150 DEF XP)');

                                var wyield = Math.ceil(members[messagerIndex].jobAt.workYield * (1.00 + 0.01 * members[messagerIndex].skillSet[0]) * (1.00 + Math.max(-0.99, members[messagerIndex].jobAt.yieldFactor)));

                                market[members[messagerIndex].jobAt.productIndex].num += wyield;

                                var randAddendOne = Math.floor(Math.random() * 899) + 100;

                                var randAddendTwo = Math.floor(Math.random() * 899) + 100;

                                additionPrompt = randAddendOne + randAddendTwo;

                                var equation = randAddendOne + ' + ' + randAddendTwo;

                                channelID.send('What is ' + equation + ' ?');
                                members[messagerIndex].inputState = 400;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            }else{
                                runningTimers[j].feed.send('You\'ve flubbed the job. Try again:');

                                var randAddendOne = Math.floor(Math.random() * 899) + 100;

                                var randAddendTwo = Math.floor(Math.random() * 899) + 100;

                                additionPrompt = randAddendOne + randAddendTwo;

                                var equation = randAddendOne + ' + ' + randAddendTwo;

                                channelID.send('What is ' + equation + ' ?');
                                members[messagerIndex].inputState = 400;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                            }
                        }
                    }
                }
                break;
            case 450:
                var illegalChars = "0123456789-=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+[]{}\\|;:'\",.<>/? ";
                var i = cmd.length;
                var isIllegal = false;
                while(i--){
                    if(illegalChars.includes(cmd.charAt(i))){
                        channelID.send('Illegal icon selected. Please select a valid emoji.');
                        isIllegal = true;
                        break;
                    }
                }
                if(isIllegal === true){
                    break;
                }
                members[messagerIndex].corp.icon = cmd;
                members[messagerIndex].inputState = 500;
                channelID.send('What will be your MegaCorp\'s name?');
                break;
            case 500:
                members[messagerIndex].corp.name = cmd;
                members[messagerIndex].inputState = 600;
                channelID.send('What will be your MegaCorp\'s industry?');
                var industryDesc = '1. Defense\n\n2. Agriculture\n\n3. Bureaucracy\n\n4. Manufacturing';
                var industryEmbed = new RichEmbed()
                .setTitle('Please select an industry from the below:')
                .setDescription(industryDesc)
                .setColor(0x00FF00);
                channelID.send(industryEmbed);
                break;
            case 600:
                var industry = '';
                if(isNaN(cmd)){
                    switch(cmd.toLowerCase()){
                        case 'agriculture':
                        case 'food':
                            industry = 'naming';
                            break;
                        case 'manufacturing':
                            industry = 'counting';
                            break;
                        case 'defense':
                            industry = 'addition';
                            break;
                        case 'bureaucracy':
                        case 'management':
                        case 'paperwork':
                            industry = 'translation';
                            break;
                        default:
                            channelID.send('Not a valid industry!');
                            var industryDesc = '1. Defense\n\n2. Agriculture\n\n3. Bureaucracy\n\n4. Manufacturing';
                            var industryEmbed = new RichEmbed()
                            .setTitle('Please select an industry from the below:')
                            .setDescription(industryDesc)
                            .setColor(0x00FF00);
                            channelID.send(industryEmbed);
                    }
                }else{
                    if(cmd < 1 || cmd > 4){
                        channelID.send('Not a valid industry!');
                        var industryDesc = '1. Defense\n\n2. Agriculture\n\n3. Bureaucracy\n\n4. Manufacturing';
                        var industryEmbed = new RichEmbed()
                        .setTitle('Please select an industry from the below:')
                        .setDescription(industryDesc)
                        .setColor(0x00FF00);
                        channelID.send(industryEmbed);
                    }else{
                        industry = workSchemes[cmd];
                    }
                }
                if(industry === ''){
                    break;
                }
                members[messagerIndex].corp.industry = industry;
                channelID.send('Successfully registered ' + members[messagerIndex].corp.icon + ' ' + members[messagerIndex].corp.name + ' as a MegaCorp. Use the ' + prefix + 'ipo command to set a product, product price, and wage level.');
                members[messagerIndex].corpIcon = members[messagerIndex].corp.icon;
                takenCorpIcons.push(members[messagerIndex].corp.icon);
                members[messagerIndex].inputState = 0;
                break;
        }
    }
    
    if (members[messagerIndex].inputState === 0 && message.substring(0, 1) === prefix) {
        
        var cmd = args[0].substring(1);
        console.log(cmd);
        switch(cmd) {
            case 'cancel':
                break;
            case 'map':
                var y, x;
                var mapText = '';
                for(y = 0; y < MAP_HEIGHT; y++){
                    for(x = 0; x < MAP_WIDTH; x++){
                        mapText += map[x + y * MAP_WIDTH];
                    }
                    mapText += '\n';
                }
                var mapEmbed = new RichEmbed()
                .setTitle('Map of the City')
                .setColor(0x000000)
                .setDescription(mapText)
                .setFooter('See ' + prefix + 'legend for more information.');
                channelID.send(mapEmbed);
                break;
            case 'inc':
                var name = '';
                var industry = '';
                if(args.length < 2){
                    channelID.send('What will your MegaCorp\'s icon be?');
                    members[messagerIndex].inputState = 450;
                    members[messagerIndex].corp = new Corp('','','');
                    break;
                }else if(args.length < 3){
                    var illegalChars = "0123456789-=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+[]{}\\|;:'\",.<>/? ";
                    var i = args[1].length;
                    var isIllegal = false;
                    while(i--){
                        if(illegalChars.includes(arg[1].charAt(i))){
                            channelID.send('Illegal icon selected. Please select a valid emoji.');
                            isIllegal = true;
                            break;
                        }
                    }
                    if(isIllegal === true){
                        break;
                    }
                    var taken = false;
                    for(var i = 0; i < takenCorpIcons.length; i++){
                        if(args[1] === takenCorpIcons[i]){
                            channelID.send('Icon is already taken!');
                            taken = true;
                            break;
                        }
                    }
                    if(taken === true){
                        break;
                    }
                    members[messagerIndex].inputState = 500;
                    members[messagerIndex].corp = new Corp(args[1], '', '');
                    channelID.send('What will be your MegaCorp\'s name?');
                    break;
                }else if(args.length < 4){
                    var illegalChars = "0123456789-=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+[]{}\\|;:'\",.<>/? ";
                    var i = args[1].length;
                    var isIllegal = false;
                    while(i--){
                        if(illegalChars.includes(arg[1].charAt(i))){
                            channelID.send('Illegal icon selected. Please select a valid emoji.');
                            isIllegal = true;
                            break;
                        }
                    }
                    if(isIllegal === true){
                        break;
                    }
                    var taken = false;
                    for(var i = 0; i < takenCorpIcons.length; i++){
                        if(args[1] === takenCorpIcons[i]){
                            channelID.send('Icon is already taken!');
                            taken = true;
                            break;
                        }
                    }
                    if(taken === true){
                        break;
                    }
                    members[messagerIndex].inputState = 600;
                    channelID.send('What will be your MegaCorp\'s industry?');
                    var industryDesc = '1. Defense\n\n2. Agriculture\n\n3. Bureaucracy\n\n4. Manufacturing';
                    var industryEmbed = new RichEmbed()
                    .setTitle('Please select an industry from the below:')
                    .setDescription(industryDesc)
                    .setColor(0x00FF00);
                    channelID.send(industryEmbed);
                    members[messagerIndex].corp = new Corp(args[1], args[2], '');
                    break;
                }else{
                    var illegalChars = "0123456789-=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+[]{}\\|;:'\",.<>/? ";
                    var i = args[1].length;
                    var isIllegal = false;
                    while(i--){
                        if(illegalChars.includes(arg[1].charAt(i))){
                            channelID.send('Illegal icon selected. Please select a valid emoji.');
                            isIllegal = true;
                            break;
                        }
                    }
                    if(isIllegal === true){
                        break;
                    }
                    var taken = false;
                    for(var i = 0; i < takenCorpIcons.length; i++){
                        if(args[1] === takenCorpIcons[i]){
                            channelID.send('Icon is already taken!');
                            taken = true;
                            break;
                        }
                    }
                    if(taken === true){
                        break;
                    }
                    members[messagerIndex].inputState = 500;
                    members[messagerIndex].corp = new Corp(args[1], '', '');
                    channelID.send('What will be your MegaCorp\'s name?');

                    if(isNaN(args[3])){
                        switch(args[3].toLowerCase()){
                            case 'agriculture':
                            case 'food':
                                industry = 'naming';
                                break;
                            case 'manufacturing':
                                industry = 'counting';
                                break;
                            case 'defense':
                                industry = 'addition';
                                break;
                            case 'bureaucracy':
                            case 'management':
                            case 'paperwork':
                                industry = 'translation';
                                break;
                            default:
                                channelID.send('Not a valid industry!');
                                var industryDesc = '1. Defense\n\n2. Agriculture\n\n3. Bureaucracy\n\n4. Manufacturing';
                                var industryEmbed = new RichEmbed()
                                .setTitle('Please select an industry from the below:')
                                .setDescription(industryDesc)
                                .setColor(0x00FF00);
                                channelID.send(industryEmbed);
                        }
                    }else{
                        if(args[3] < 1 || args[3] > 4){
                            channelID.send('Not a valid industry!');
                            var industryDesc = '1. Defense\n\n2. Agriculture\n\n3. Bureaucracy\n\n4. Manufacturing';
                            var industryEmbed = new RichEmbed()
                            .setTitle('Please select an industry from the below:')
                            .setDescription(industryDesc)
                            .setColor(0x00FF00);
                            channelID.send(industryEmbed);
                        }else{
                            industry = workSchemes[args[3]];
                        }
                    }
                    if(industry === ''){
                        members[messagerIndex].corp = new Corp(args[1], args[2], '');
                        members[messagerIndex].inputState = 600;
                        break;
                    }
                    members[messagerIndex].corp = new Corp(args[1], args[2], industry);
                    channelID.send('Successfully registered ' + args[1] + ' ' + args[2] + ' as a MegaCorp. Use the ' + prefix + 'ipo command to set a product, product price, and wage level.');
                    members[messagerIndex].corpIcon = members[messagerIndex].corp.icon;
                    takenCorpIcons.push(members[messagerIndex].corp.icon);
                    break;
                }
                break;
            case 'legend':
                var legendText = ':white_small_square: - Unoccupied\n';
                for(var i = 0; i < members.length; i++){
                    if(members[i].corpIcon === ''){
                        continue;
                    }
                    legendText += members[i].corpIcon + ' - ' + members[i].corp.name + '\n';
                }
                var legendEmbed = new RichEmbed()
                .setTitle('Legend of the Map of the City')
                .setColor(0xFFFFFF)
                .setDescription(legendText);
                channelID.send(legendEmbed);
                break;
            case 'claim':
                if(args.length < 3 || isNaN(args[1]) || isNaN(args[2])){
                    channelID.send('Usage: ' + prefix + 'settle <x coordinate> <y coordinate> (coordinates are 0-based)');
                    break;
                }else{
                    if(members[messagerIndex].corpIcon === ''){
                        channelID.send('Register a MegaCorp using ' + prefix + 'inc to use the territory system.');
                        break;
                    }
                    if(members[messagerIndex].corp.territory <= 0){
                        channelID.send(members[messagerIndex].corp.name + ' has not yet established territory! Use ' + prefix + 'settle to establish a base of operations.');
                    }
                    
                }
                var x = parseInt(args[1]);
                var y = parseInt(args[2]);
                if(x < 0 || x >= MAP_WIDTH){
                    channelID.send('x coordinate is out of bounds. Try again.');
                    break;
                }
                if(y < 0 || y >= MAP_HEIGHT){
                    channelID.send('y coordinate is out of bounds. Try again.');
                    break;
                }
                if(underlyingMap[x + y * MAP_WIDTH] != -1){
                    var squareOwner = members[underlyingMap[x + y * MAP_WIDTH]];
                    channelID.send('This square has already been claimed by ' + squareOwner.memberName + ' for ' + squareOwner.corp.name + ' !');
                    break;
                }
                var adjacent = false;
                for(var yy = -1; yy <= 1; yy++){
                    for(var xx = -1; xx <= 1; xx++){
                        if(yy === 0 && xx === 0){
                            continue;
                        }
                        var ix = x + xx;
                        var iy = y + yy;
                        console.log('('+ix+','+iy+')');
                        if(ix + iy * MAP_WIDTH >= 0 && ix + iy * MAP_WIDTH < map.length){
                            console.log(map[ix + iy * MAP_WIDTH]);
                            if(underlyingMap[ix + iy * MAP_WIDTH] === messagerIndex){
                                adjacent = true;
                                break;
                            }   
                        }
                    }
                    if(adjacent === true){
                        break;
                    }
                }
                if(adjacent === false){
                    channelID.send('You can only claim territory that is adjacent to your own!');
                    break;
                }else{
                    var i;
                    var canPay = false;
                    for(i = 0; i < members[messagerIndex].inventory.length; i++){
                        if(members[messagerIndex].inventory[i].name === 'Gear'){
                            if(members[messagerIndex].inventory[i].num > 10){
                                members[messagerIndex].inventory[i].num -= 10;
                                canPay = true;
                            }
                        }
                    }
                    if(canPay === false){
                        channelID.send('Insufficient industry to claim this area. You need 10 Gears.');
                        break;
                    }
                    map[x + y * MAP_WIDTH] = members[messagerIndex].corpIcon;
                    underlyingMap[x + y * MAP_WIDTH] = messagerIndex;
                    members[messagerIndex].corp.territory++;
                    channelID.send('Settled (' + x + ',' + y + ') for ' + members[messagerIndex].corp.name);
                    var y, x;
                    var mapText = '';
                    for(y = 0; y < MAP_HEIGHT; y++){
                        for(x = 0; x < MAP_WIDTH; x++){
                            mapText += map[x + y * MAP_WIDTH];
                        }
                        mapText += '\n';
                    }
                    var mapEmbed = new RichEmbed()
                    .setTitle('Map of the City')
                    .setColor(0x000000)
                    .setDescription(mapText)
                    .setFooter('See ' + prefix + 'legend for more information.');
                    channelID.send(mapEmbed);
                }
                break;
            case 'settle':
                if(args.length < 3 || isNaN(args[1]) || isNaN(args[2])){
                    channelID.send('Usage: ' + prefix + 'settle <x coordinate> <y coordinate> (coordinates are 0-based)');
                    break;
                }else{
                    if(members[messagerIndex].corpIcon === ''){
                        channelID.send('Register a MegaCorp using ' + prefix + 'inc to use the territory system.');
                        break;
                    }
                    if(members[messagerIndex].corp.territory > 0){
                        channelID.send(members[messagerIndex].corp.name + ' already established territory! Use ' + prefix + 'claim to claim **adjacent** territory.');
                    }
                    
                    var x = parseInt(args[1]);
                    var y = parseInt(args[2]);
                    if(x < 0 || x >= MAP_WIDTH){
                        channelID.send('x coordinate is out of bounds. Try again.');
                        break;
                    }
                    if(y < 0 || y >= MAP_HEIGHT){
                        channelID.send('y coordinate is out of bounds. Try again.');
                        break;
                    }
                    if(underlyingMap[x + y * MAP_WIDTH] != -1){
                        var squareOwner = members[underlyingMap[x + y * MAP_WIDTH]];
                        channelID.send('This square has already been claimed by ' + squareOwner.memberName + ' for ' + squareOwner.corp.name + ' !');
                        break;
                    }
                    var i;
                    var canPay = false;
                    for(i = 0; i < members[messagerIndex].inventory.length; i++){
                        if(members[messagerIndex].inventory[i].name === 'Paperwork'){
                            if(members[messagerIndex].inventory[i].num > 100){
                                members[messagerIndex].inventory[i].num -= 100;
                                canPay = true;
                            }
                        }
                    }
                    if(canPay === false){
                        channelID.send('Insufficient paperwork to settle a territory for your MegaCorp. You need at least 1000.');
                        break;
                    }
                    map[x + y * MAP_WIDTH] = members[messagerIndex].corpIcon;
                    underlyingMap[x + y * MAP_WIDTH] = messagerIndex;
                    members[messagerIndex].corp.territory++;
                    channelID.send('Settled (' + x + ',' + y + ') for ' + members[messagerIndex].corp.name);
                    var y, x;
                    var mapText = '';
                    for(y = 0; y < MAP_HEIGHT; y++){
                        for(x = 0; x < MAP_WIDTH; x++){
                            mapText += map[x + y * MAP_WIDTH];
                        }
                        mapText += '\n';
                    }
                    var mapEmbed = new RichEmbed()
                    .setTitle('Map of the City')
                    .setColor(0x000000)
                    .setDescription(mapText)
                    .setFooter('See ' + prefix + 'legend for more information.');
                    channelID.send(mapEmbed);
                    break;
                }
                break;
            case 'research':
            case 'papers':
            case 'news':
                var k;
                var inInventory = false;
                for(k = 0; k < members[messagerIndex].inventory.length; k++){
                    if(members[messagerIndex].inventory[k].name === 'Paperwork'){
                        if(members[messagerIndex].inventory[k].num >= 10){
                            channelID.send('Looking into imminent events..');
                            var newsMessage = 'There aren\'t any imminent events.';
                            if(events.length > 0){
                                var randEventIndex = Math.floor(Math.random() * events.length);
                                newsMessage = events[randEventIndex].description;
                            }
                            msg.author.send(newsMessage);
                            members[messagerIndex].inventory[k].num -= 10;
                            inInventory = true;
                            break;
                        }
                    }
                }
                if(inInventory === false){
                    channelID.send('You don\'t have the required amount of paperwork to find anything out!');
                }
                break;
            case 'close':
                var currAuction = checkCurrentAuction();
                if(currAuction === -1){
                    channelID.send('There is no auction open at this time.');
                    break;
                }
                if(currAuction.seller.memberName != members[messagerIndex].memberName){
                    channelID.send('The current auction was not opened by you. Please type ' + prefix + 'auction for more information.');
                    break;
                }
                var currBid = checkCurrentBid();
                if(currBid === -1){
                    var l;
                    for(l = 0; l < members[messagerIndex].inventory.length; l++){
                        if(members[messagerIndex].inventory[l].name === currAuction.item.name){
                            members[messagerIndex].inventory[l].num += currAuction.amount;
                        }
                    }
                    currentAuction = -1;
                    //members[messagerIndex].balance += currBid.bid;
                    channelID.send(members[messagerIndex].memberName + ' has closed the auction. There were no bids.');
                    break;
                }
                var k;
                var notFound = true;
                for(k = 0; k < currBid.bidder.inventory.length; k++){
                    if(currBid.bidder.inventory[k].name === currAuction.item.name){
                        currBid.bidder.inventory[k].num += currAuction.amount;
                        notFound = false;
                        break;
                    }
                }
                if(notFound === true){
                    currBid.bidder.inventory.push(new ItemSlot(currAuction.item.name, currAuction.item.price, currAuction.amount));
                }
                members[messagerIndex].balance += currBid.bid;
                channelID.send(members[messagerIndex].memberName + ' has closed the auction.');
                currentAuction = -1;
                currentBid = -1;
                break;
            case 'bid':
                var currAuction = checkCurrentAuction();
                var bid;
                if(currAuction === -1){
                    channelID.send('No auction going on right now.');
                    break;
                }
                if(args.length < 2){		
                    channelID.send('Current auction was started by ' + currAuction.seller.memberName + '. It is for ' + currAuction.amount +  ' ' + currAuction.item.name + '(s), with the bidding currently at ' + currAuction.currBid + '.');
                    var currBid = checkCurrentBid();
                    if(currBid != -1){
                        channelID.send('If the auction closed now, ' + currBid.bidder.memberName + ' would get the ' + currAuction.amount + ' ' + currAuction.item.name + '(s) for ' + currAuction.currBid + '.');
                    }else{
                        channelID.send('If the auction closed now, the ' + currAuction.item.name + '(s) would return to ' + currAuction.seller.memberName + ', who opened this auction in the first place.');
                    }
                    break;
                }else if(args.length < 3){
                    if(members[messagerIndex].memberName === currAuction.seller.memberName){
                        channelID.send('You can\'t bid for your own items!');
                        break;
                    }
                    bid = parseFloat(args[1]);
                    if(bid > members[messagerIndex].balance){
                        channelID.send('You can\'t bid with what you don\'t have!');
                        break;
                    }
                    currBid = checkCurrentBid();
                    if(bid > currAuction.currBid || (bid === currAuction.currBid && currBid === -1)){
                        currBid = checkCurrentBid();
                        if(currBid != -1){
                            currBid.bidder.balance += currAuction.currBid;
                        }
                        channelID.send('Putting up $' + bid + ' for ' + currAuction.seller.memberName + '\'s ' + currAuction.amount + ' ' + currAuction.item.name + '(s).');
                        currentBid = {
                            'bidder': members[messagerIndex],
                            'bid': bid
                        };
                        currAuction.currBid = bid;
                        members[messagerIndex].balance -= bid;
                        break;
                    }else{
                        channelID.send('Minimum bid for this auction is at ' + currAuction.currBid + '!');
                        break;
                    }
                }
                break;
            case 'auction':
                var itemName;
                var item;
                var amount;
                var startBid;
                var currAuction = checkCurrentAuction();
                var currBid = checkCurrentBid();
                if(args.length < 2){
                    channelID.send('Insufficient arguments: usage: ' + prefix + 'auction <item name> <amount> <starting bid>.');
                    if(currAuction != -1){
                        channelID.send('Current auction is ' + currAuction.seller.memberName + '\'s ' + currAuction.amount + ' ' + currAuction.item.name + '(s).');
                    }
                    if(currBid != -1){
                        channelID.send('Current bid is at $' + currBid.bid + ' by ' + currBid.bidder.memberName + '.');
                    }
                    break;
                }else if(args.length < 3){
                    itemName = args[1];
                    amount = 1;
                    var k;
                    var inMarket = false;
                    if(isNaN(itemName) === true){
                        for(k = 0; k < market.length; k++){
                            if(itemName.toLowerCase() === market[k].name.toLowerCase()){
                                item = market[k];
                                inMarket = true;
                                break;
                            }
                        }
                        if(inMarket === false){
                            for(k = 0; k < exchange.length; k++){
                                if(itemName.toLowerCase() === exchange[k].name.toLowerCase()){
                                    item = exchange[k];
                                    inMarket = true;
                                    break;
                                }
                            }	
                        }
                    }else{
                        if(itemName - 1 >= 0 && itemName - 1 < market.length + exchange.length){
                            if(itemName - 1 > market.length){
                                item = exchange[itemName - 1 - market.length];
                                inMarket = true;
                            }else{
                                item = market[itemName - 1];
                                inMarket = true;
                            }
                        }
                    }
                    if(inMarket === false){
                        channelID.send('That is not a market item!');
                        break;
                    }
                    startBid = item.price;
                    //break;
                }else if(args.length < 4){
                    itemName = args[1];
                    amount = parseInt(args[2]);
                    var k;
                    var inMarket = false;
                    if(isNaN(itemName) === true){
                        for(k = 0; k < market.length; k++){
                            if(itemName.toLowerCase() === market[k].name.toLowerCase()){
                                item = market[k];
                                inMarket = true;
                                break;
                            }
                        }
                        if(inMarket === false){
                            for(k = 0; k < exchange.length; k++){
                                if(itemName.toLowerCase() === exchange[k].name.toLowerCase()){
                                    item = exchange[k];
                                    inMarket = true;
                                    break;
                                }
                            }	
                        }
                    }else{
                        if(itemName - 1 >= 0 && itemName - 1 < market.length + exchange.length){
                            if(itemName - 1 > market.length){
                                item = exchange[itemName - 1 - market.length];
                                inMarket = true;
                            }else{
                                item = market[itemName - 1];
                                inMarket = true;
                            }
                        }
                    }
                    if(inMarket === false){
                        channelID.send('That is not a market item!');
                        break;
                    }
                    startBid = item.price * amount;
                    //break;
                }else{
                    itemName = args[1];
                    amount = parseInt(args[2]);
                    startBid = parseInt(args[3]);
                    var k;
                    var inMarket = false;
                    if(isNaN(itemName) === true){
                        for(k = 0; k < market.length; k++){
                            if(itemName.toLowerCase() === market[k].name.toLowerCase()){
                                item = market[k];
                                inMarket = true;
                                break;
                            }
                        }
                        if(inMarket === false){
                            for(k = 0; k < exchange.length; k++){
                                if(itemName.toLowerCase() === exchange[k].name.toLowerCase()){
                                    item = exchange[k];
                                    inMarket = true;
                                    break;
                                }
                            }	
                        }
                    }else{
                        if(itemName - 1 >= 0 && itemName - 1 < market.length + exchange.length){
                            if(itemName - 1 > market.length){
                                item = exchange[itemName - 1 - market.length];
                                inMarket = true;
                            }else{
                                item = market[itemName - 1];
                                inMarket = true;
                            }
                        }
                    }
                    if(inMarket === false){
                        channelID.send('That is not a market item!');
                        break;
                    }
                }
                if(amount === 0){
                    channelID.send('You can\'t put up an auction for nothing...');
                    break;
                }
                if(currAuction != -1){
                    channelID.send('The current auction must be closed before another can be opened.');
                    break;
                }
                var l;
                var dontHave = true;
                for(l = 0; l < members[messagerIndex].inventory.length; l++){
                    if(item.name.toLowerCase() === members[messagerIndex].inventory[l].name.toLowerCase()){
                        if(members[messagerIndex].inventory[l].num >= amount){
                            members[messagerIndex].inventory[l].num -= amount;
                            channelID.send('Putting up '+ amount + ' ' + members[messagerIndex].inventory[l].name +'(s).');
                            dontHave = false;
                        }
                        break;
                    }
                }
                if(dontHave === true){
                    channelID.send('You can\'t put up what you don\'t have.');
                    break;
                }
                startBid = Math.trunc(startBid * 100) / 100;
                channelID.send('Starting auction for ' + amount + ' ' + item.name + '(s)! Bidding starts at $' + startBid + '! @' + members[messagerIndex].memberName + ', type ' + prefix + 'close to close the auction and complete the transaction.');
                setCurrentAuction(members[messagerIndex], item, amount, startBid);
                break;				
            case 'switchDefaultChannel':
                channelID.send('*Default channel switched from ' + defaultChannel + ' to ' + channelID + '*');
                defaultChannel = channelID;
                break;
            case 'help':
                var helpEmbed = new RichEmbed()
                .setTitle('Discord Tycoon commands')
                .setColor(0xFF0000)
                .setDescription(getHelpMessage());
                channelID.send(helpEmbed);
                //channelID.send(getHelpMessage());
                break;
            case 'standings':
                var standingsEmbed = new RichEmbed()
                .setTitle('Users\' Standings')
                .setColor(0x00FF00)
                .setDescription(getUpdateMessage());
                channelID.send(standingsEmbed);
                break;
            case 'whoami':
                channelID.send('You are ' + user + '!');
                break;
            case 'setprefix':
                if(args.length < 2){
                    channelID.send('Insufficient arguments: usage: ' + prefix + 'setprefix <prefix symbol>.');
                    break;
                }
                prefix = args[1].substring(0, 1);
                channelID.send('Prefix changed to ' + prefix + '.');
                break;
            case 'buy':
                if(args.length < 2){
                    channelID.send('Insufficient arguments: usage: ' + prefix + 'buy <item name> <amount>.');
                    break;
                }
                var itemName = args[1];
                var amount = 1;
                if(args.length > 2){
                    if(isNaN(args[2]) === true){
                        channelID.send('usage: ' + prefix + 'buy <item name> <amount>.');
                        break;
                    }
                    amount = parseInt(args[2]);
                }
                var attempt = addItem(user, itemName, amount);

                switch(attempt){
                    case 0:
                        if(isNaN(itemName) === false && (parseInt(itemName) - 1 >= 0 && parseInt(itemName) - 1 < exchange.length + market.length)){
                            if(itemName - 1 >= market.length){
                                itemName -= market.length;
                                itemName = exchange[itemName - 1].name;
                            }else{
                                itemName = market[itemName - 1].name;
                            }
                            channelID.send(user + ' bought ' + amount + ' ' + itemName + '(s).');
                        }else{
                            var kk;
                            for(kk = 0; kk < market.length; kk++){
                                if(itemName.toLowerCase() === market[kk].name.toLowerCase()){
                                    itemName = market[kk].name;
                                }
                            }
                            for(kk = 0; kk < exchange.length; kk++){
                                if(itemName.toLowerCase() === exchange[kk].name.toLowerCase()){
                                    itemName = exchange[kk].name;
                                }
                            }
                            channelID.send(user + ' bought ' + amount + ' ' +itemName+'(s).');
                        }
                        break;
                    case -1:
                        channelID.send('No member with the name ' + user + ' has been found!');
                        break;
                    case -2:
                        if(isNaN(itemName) === false && (parseInt(itemName) - 1 >= 0 && parseInt(itemName) - 1 < exchange.length + market.length)){
                            if(itemName - 1 >= market.length){
                                itemName -= market.length;
                                itemName = exchange[itemName - 1].name;
                            }else{
                                itemName = market[itemName - 1].name;
                            }
                        }else{
                            var kk;
                            for(kk = 0; kk < market.length; kk++){
                                if(itemName.toLowerCase() === market[kk].name.toLowerCase()){
                                    itemName = market[kk].name;
                                }
                            }
                            for(kk = 0; kk < exchange.length; kk++){
                                if(itemName.toLowerCase() === exchange[kk].name.toLowerCase()){
                                    itemName = exchange[kk].name;
                                }
                            }
                        }
                        channelID.send('There aren\'t/isn\'t even ' + amount + ' ' + itemName + '(s) in the market!');
                        break;
                    case -3:
                        if(isNaN(itemName) === false && (parseInt(itemName) - 1 >= 0 && parseInt(itemName) - 1 < exchange.length + market.length)){
                            if(itemName - 1 >= market.length){
                                itemName -= market.length;
                                itemName = exchange[itemName - 1].name;
                            }else{
                                itemName = market[itemName - 1].name;
                            }
                        }else{
                            var kk;
                            for(kk = 0; kk < market.length; kk++){
                                if(itemName.toLowerCase() === market[kk].name.toLowerCase()){
                                    itemName = market[kk].name;
                                }
                            }
                            for(kk = 0; kk < exchange.length; kk++){
                                if(itemName.toLowerCase() === exchange[kk].name.toLowerCase()){
                                    itemName = exchange[kk].name;
                                }
                            }
                        }
                        channelID.send('Can\'t afford ' + amount + ' ' + itemName + '(s)!');
                        break;
                }
                break;
            case 'store':
            case 'market':
                var marketEmbed = new RichEmbed()
                .setTitle('The Market')
                .setColor(0xFFFF00)
                .setDescription(listMarket());
                channelID.send(marketEmbed);
                break;
            case 'work':
                if(args.length < 2){
                    var output = '';
                    var i;
                    for(i = 0; i < industries.length; i++){
                        output += '\n\n' + (i+1)+'.\t**'+industries[i].name+'** base pay $' + industries[i].wage;
                    }
                    var workEmbed = new RichEmbed()
                    .setTitle('Which business are you working for?')
                    .setColor(0xFF00FF)
                    .setDescription(output);
                    channelID.send(workEmbed);
                    members[messagerIndex].inputState = 1;
                    break;
                }else{
                    var industry = args[1];
                    var attempt = workFor(industry);
                    if(attempt >= 0){
                        //chose real industry, set up work prompt
                        var industryItem = industries[attempt];
                        members[messagerIndex].jobAt = industryItem;
                        switch(industryItem.workScheme){
                            case 'addition':
                                var randAddendOne = Math.floor(Math.random() * 899) + 100;

                                var randAddendTwo = Math.floor(Math.random() * 899) + 100;

                                additionPrompt = randAddendOne + randAddendTwo;

                                var equation = randAddendOne + ' + ' + randAddendTwo;

                                channelID.send('What is ' + equation + '?');
                                members[messagerIndex].inputState = 400;								

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                                break;
                            case 'counting':
                                var randNum = Math.floor(Math.random() * 19) + 5;
                                var dots = '';
                                var i;
                                countingPrompt = randNum;
                                for(i = 0; i < randNum; i++){
                                    dots += '\t.';
                                }
                                channelID.send('How many dots are there?\n' + dots);
                                members[messagerIndex].inputState = 300;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                                break;
                            case 'translation':
                                var validChars = 'abcdefghijklmnopqrstuv';
                                var randLen = Math.floor(Math.random() * 8) + 5;
                                var i;

                                translationPrompt = '';

                                for(i = 0; i < randLen; i++){
                                    translationPrompt += validChars.charAt(Math.floor(Math.random() * validChars.length));
                                }

                                var tempArr = translationPrompt.split("");
                                tempArr = tempArr.reverse();
                                var translation = tempArr.join("");

                                channelID.send('What is *' + translation + '* in reverse?');
                                members[messagerIndex].inputState = 200;


                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                                break;
                            case 'naming':

                                var randIndex = Math.floor(Math.random() * namingItems.length);
                                namingPrompt = ':'+namingItems[randIndex];
                                var j;
                                for(j = 0; j < 4; j++){
                                    randIndex = Math.floor(Math.random() * namingItems.length);
                                    namingPrompt += ': :' + namingItems[randIndex];
                                }
                                namingPrompt += ':';
                                channelID.send('Name the item: :' + namingPrompt);
                                members[messagerIndex].inputState = 100;

                                insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
                                break;
                        }
                        break;
                    }else{
                        switch(attempt){
                            case -1:
                                channelID.send('That business doesn\'t exist! Please pick a real business.');
                                members[messagerIndex].inputState = 0;
                                break;
                            default:
                                break;
                        }
                        break;
                    }
                }
            case 'balance':
                var balanceEmbed = new RichEmbed()
                .setTitle('Balance Statement for ' + members[messagerIndex].memberName)
                .setColor(0x0000FF)
                .setDescription(getUpdateMessage(members[messagerIndex]));
                channelID.send(balanceEmbed);
                break;
            default:
                if(cmd === 'register' || cmd === 'hello')
                    break;
                channelID.send('No such command. Please see ' + prefix + 'help.');
        }
    }

});

//console.log(process.env.CORN_DISCTOKEN);
client.login(process.env.CORN_DISCTOKEN);