var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {colorize: true});
logger.level = 'debug';
var bot = new Discord.Client({token: auth.token, autorun: true});
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

class Event{
	constructor(description, industry, effectFactor){
		this.description = description;
		this.industry = industry;
		this.effectFactor = effectFactor;
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
	set effectFactor(num){
		this._effectFactor = num;
	}
	get effectFactor(){
		return this._effectFactor;
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

function insertTimer(delay, channelID, message, messager){
	var i;
	for(i = 0; i < runningTimers.length; i++){
		if(runningTimers[i].messager.memberName == messager.memberName){
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
		this.stockFactor = 1.00;
	}
	set stockFactor(flt){
		this._stockFactor = flt;
	}
	get stockFactor(){
		return this._stockFactor;
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
		return this._basePrice * this._demandIndex;
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
	if(isNaN(industry) == false){
		if(parseInt(industry) - 1 < 0 || parseInt(industry) - 1 >= industries.length){
			return -1;
		}
		return parseInt(industry) - 1;
	}
	var i;
	for(i = 0; i < industries.length; i++){
		if(industry.toLowerCase() == industries[i].name.toLowerCase()){
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
class Member {
	constructor(name){
		this.memberName = name;
		this.balance = 20000;
		this.inventory = [];
		this.inputState = 0;
		this.hasTimer = false;
		this.skillSet = [1,1,1,1];
		this.skillExp = [0,0,0,0];
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
		if(members[i].memberName == user){
			member = members[i];
		}
	}
	if(member == undefined){
		return -1;
	}
	var inMarket = false;
	var inExchange = false;
	var marketItem;
	//logger.info(item);
	if(isNaN(item) == true){
		
		for(i = 0; i < market.length; i++){
			//logger.info(market[i].name);
			if(market[i].name == item){
				inMarket = true;
				marketItem = market[i];
				break;
			}
		}
		for(i = 0; i < exchange.length; i++){
			if(exchange[i].name == item){
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
	if(inMarket == false || marketItem.num < amount){
		return -2;
	}
	if(marketItem.price * amount > member.balance){
		return -3;
	}
	var marketIndustry = marketItem.industry;
	for(i = 0; i < member.inventory.length; i++){
		if(member.inventory[i].name == item){
			member.inventory[i].num += amount;
			member.balance = member.balance - marketItem.price * amount;
			if(inExchange == false){
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
	if(inExchange == false){
		marketIndustry.demandIndex += 0.01 * amount;
		marketItem.price = Math.round(marketItem.price * 10) / 10;
	}
	return 0;
}
function register(user){
	var i;
	for(i = 0; i < members.length; i++){
		if(members[i].memberName == user){
			return false;
		}
	}
	var newMember = new Member(user);
	members.push(newMember);
	return true;
}
function listMarket(){
	var i;
	var output = '```';
	for(i = 0; i < market.length; i++){
		output += (i + 1) + '.\t' + market[i].name + ' - [$' + market[i].price + ']\n\t' + market[i].description + '\n\t' + market[i].num + ' left in stock.\n';
	}
	for(i = 0; i < exchange.length; i++){
		output += (i + 1 + market.length) + '.\t' + exchange[i].name + ' - [$' + exchange[i].price + ']\n\t' + exchange[i].description + '\n\t' + exchange[i].num + ' left in stock.\n';
	}
	output += '```';
	return output;
}

function initializeEconomy(){
	var i;
	createIndustry('MissileCorp', 'addition', 60, 'Missile');
	createIndustry('ThePotatoFarm', 'naming', 20, 'Potato');
	createIndustry('ManufacturingInc', 'counting', 105, 'Gear');
	createIndustry('PaperHouse', 'translation', 35, 'Paperwork');
	for(i = 0; i < industries.length; i++){
		var name = industries[i].name + '-Stock';
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
		createItem(name, price, 10, description);
		industries[i].productIndex = market.length - 1;
		market[market.length - 1].industry = industries[i];
	}
	updatePrices();
	events = [];
	for(j = 0; j < 5; j++){
		var randIndustry = Math.floor(Math.random() * workSchemes.length);
		var factor = Math.trunc(Math.random() * 400 - Math.random() * 200) / 100;
		var desc = 'The ' + workSchemes[randIndustry] +  ' industry will be affected by a factor of ' + factor + '.';
		events.push(new Event(desc, workSchemes[randIndustry], factor));
	}
}
function welcomeBot(channelID){
	defaultChannel = channelID;
	register(bot.username);
	initializeEconomy();
	insertTimer(7200000, defaultChannel, 'Market Forces - Price Decay!', members[0]);
	bot.sendMessage({
		to: defaultChannel,
		message: bot.username + ' activated!'
	});
}
function updatePrices(){
	var i;
	for(i = 0; i < industries.length; i++){
		//market[i].price = industries[i].price;
		market[i].price = Math.trunc(industries[i].price * 100) / 100;
	}
	for(i = 0; i < industries.length; i++){
		//exchange[i].price = industries[i].index;
		exchange[i].price = Math.trunc(industries[i].index * 100) / 100;
	}
	for(i = 0; i < industries.length; i++){
		//industries[i].wage = industries[i].price / 10.0;
		industries[i].wage = Math.trunc(industries[i].wage * 100) / 100;
	}
}
function getUpdateMessage(){
	var output = '';
	var i;
	if(members.length == 0){
		return 'No members currently registered. Please register using the '+prefix+'register command.'
	}
	output += '```';
	for(i = 0; i < members.length; i++){
		output += members[i].memberName + ': \n\tbalance: $' + members[i].balance + '\n\tinventory:\n';
		var j;
		for(j = 0; j < members[i].inventory.length; j++){
			output += '\t\t'+members[i].inventory[j].name+': '+members[i].inventory[j].num+'\n';
		}
	}
	output += '```';
	
	return output;
}
function getHelpMessage(){
	return '```help - shows list of commands with a brief description.\nupdate - returns an update of the user\'s account.\nwhoami - who are you?\nregister - registers a user into the system.\nsetprefix - changes the command prefix.\nbuy - adds an item to the member\'s inventory\nmarket - list the items for sale\nwork - work for money\nswitchDefaultChannel - switches default announcement channel\n```';
}
bot.on('ready', function (evt){
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.username + ' - (' + bot.id + ')');
	
});
setInterval(function(){
	var j;
	for(j = 0; j < industries.length; j++){
		industries[j].stockFactor = 1.00;
	}
	for(j = 0; j < events.length; j++){
		var i;
		for(i = 0; i < industries.length; i++){
			if(industries[i].workScheme == events.industry){
				industries[i].stockFactor += events.effectFactor;
			}
		}
	}
	events = [];
	for(j = 0; j < 5; j++){
		var randIndustry = Math.floor(Math.random() * workSchemes.length);
		var factor = Math.trunc(Math.random() * 400 - Math.random() * 200) / 100;
		var desc = 'The ' + workSchemes[randIndustry] +  ' industry will be affected by a factor of ' + factor + '.';
		events.push(new Event(desc, workSchemes[randIndustry], factor));
	}
}, 3600000);
setInterval(function(){
	var i;
	for(i = 0; i < runningTimers.length; i++){
		if(runningTimers[i].time > 0){
			if(runningTimers[i].time == 1){
				bot.sendMessage({
					to: runningTimers[i].feed,
					message: runningTimers[i].message
				});
			}
			runningTimers[i].time--;
		}else{
			if(runningTimers[i].messager.memberName == bot.username){
				if(runningTimers[i].message == 'Market Forces - Price Decay!'){
					var j;
					for(j = 0; j < industries.length; j++){
						var k;
						var marketItem;
						for(k = 0; k < market.length; k++){
							if(market[k].name == industries[j].product){
								marketItem = market[k];
							}
						}
						if(industries[j].demandIndex > 1.00){
							industries[j].demandIndex = 1.00 + Math.trunc((((industries[j].demandIndex - 1.00) / marketItem.num) * 100)) / 100;
						}
					}
				}
			}
			if(runningTimers[i].time == 0){
				
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
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
	if(message == prefix + 'welcome' && defaultChannel == -1){
		logger.info('activating bot!');
		welcomeBot(channelID);
		return;
	}
	if(defaultChannel == -1){
		logger.info('bot not yet activated!');
		return;
	}
	if(bot.username == user){
		return;
	}
	var messagerIndex;
	var unregistered = true;
	var k;
	if(message == prefix + 'register' || message == prefix + 'hello'){				
		if(register(user) == true){
			bot.sendMessage({
				to: channelID, 
				message: 'Registering ' + user + ', please see ' + prefix + 'help.'
			});
		}else{
			bot.sendMessage({
				to: channelID, 
				message: 'Already registered ' + user + '!'
			});
		}
	}
	for(k = 0; k < members.length; k++){
		if(user == members[k].memberName){
			messagerIndex = k;
			unregistered = false;
		}
	}
	if(unregistered == true){
		if(message.substring(0, 1) == prefix){	
			bot.sendMessage({
				to: channelID,
				message: '*' + user + ', you are unregistered. Please use the ' + prefix + 'register command to use this bot.*'
			});
		}
		return;
	}
	updatePrices();
	//logger.info(user + ' is at state ' + members[messagerIndex].inputState);
	if(members[messagerIndex].inputState != 0){
	var args = message.split(' ');
	var cmd = args[0];	
	if(cmd == prefix + 'cancel' || cmd == 'cancel'){
		bot.sendMessage({
			to: channelID,
			message: 'Canceling action.'
		});
		members[messagerIndex].inputState = 0;	
		var k;
		for(k = 0; k < runningTimers.length; k++){
			if(runningTimers[k].messager.memberName == members[messagerIndex].memberName){
				runningTimers[k].time = -2;
				break;
			}
		}
		return;

	}
	switch(members[messagerIndex].inputState){
		//logger.info(members[messagerIndex].inputState);
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
						
						bot.sendMessage({
							to: channelID,
							message: 'What is ' + equation + ' ?'
						});
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
						bot.sendMessage({
							to: channelID,
							message: 'How many dots are there?\n' + dots
						});
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
							
						bot.sendMessage({
							to: channelID,
							message: 'What is *' + translation + '* in reverse?'
						});
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
						bot.sendMessage({
							to: channelID,
							message: 'Name the items (joined by a \'-\'): :' + namingPrompt + ':'
						});
						members[messagerIndex].inputState = 100;
					
					
					
						insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
						break;
				}
			}else{
				bot.sendMessage({
					to: channelID,
					message: 'That business doesn\'t exist! Please pick a real business.'
				});
			}
			break;
		case 100:
			//awaiting input for naming work prompt
			var j;
			for(j = 0; j < runningTimers.length; j++){
				if(runningTimers[j].messager.memberName == members[messagerIndex].memberName){
					if(runningTimers[j].time > 0){
						logger.info(namingPrompt.split(':').join('').split(' ').join('-'));
						if(namingPrompt.split(':').join('').split(' ').join('-') == cmd){
							members[messagerIndex].skillExp[3] += 10 + members[messagerIndex].skillSet[3];
							if(members[messagerIndex].skillExp[3] >= 150){
								members[messagerIndex].skillExp[3] -= 150;
								members[messagerIndex].skillSet[3]++;
								bot.sendMessage({
									to: channelID,
									message: 'You\'ve become more familiar with this industry. Your skill in this industry increases to level ' + members[messagerIndex].skillSet[3] + '!'
								});
							}
							var pay = (members[messagerIndex].jobAt.wage * (members[messagerIndex].skillSet[3]));
							
							members[messagerIndex].balance += pay;
							bot.sendMessage({
								to: runningTimers[j].feed,
								message: 'Nice job! You\'re paid $' + pay + ' for your hard work. (' + members[messagerIndex].skillExp[3] + '/150 XP)'
							});
							
							market[members[messagerIndex].jobAt.productIndex].num++;
							
							var randIndex = Math.floor(Math.random() * namingItems.length);
							namingPrompt = ':'+namingItems[randIndex];
							var k;
							for(k = 0; k < 4; k++){
								randIndex = Math.floor(Math.random() * namingItems.length);
								namingPrompt += ': :' + namingItems[randIndex];
							}
							namingPrompt += ':';
							bot.sendMessage({
								to: channelID,
								message: 'Name the items (joined by a \'-\'): ' + namingPrompt
							});
							members[messagerIndex].inputState = 100;
							
							insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
						}else{
							bot.sendMessage({
								to:runningTimers[j].feed,
								message: 'You\'ve flubbed the job. Try again:'
							});
							
							var randIndex = Math.floor(Math.random() * namingItems.length);
							namingPrompt = ':'+namingItems[randIndex];
							var k;
							for(k = 0; k < 4; k++){
								randIndex = Math.floor(Math.random() * namingItems.length);
								namingPrompt += ': :' + namingItems[randIndex];
							}
							namingPrompt += ':';
							bot.sendMessage({
								to: channelID,
								message: 'Name the items (joined by a \'-\'): ' + namingPrompt
							});
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
				if(runningTimers[j].messager.memberName == members[messagerIndex].memberName){
					if(runningTimers[j].time > 0){
						if(translationPrompt == cmd){
							members[messagerIndex].skillExp[2] += 10 + members[messagerIndex].skillSet[2];
							if(members[messagerIndex].skillExp[2] >= 150){
								members[messagerIndex].skillExp[2] -= 150;
								members[messagerIndex].skillSet[2]++;
								bot.sendMessage({
									to: channelID,
									message: 'You\'ve become more familiar with this industry. Your skill in this industry increases to level ' + members[messagerIndex].skillSet[2] + '!'
								});
							}
							var pay = (members[messagerIndex].jobAt.wage * (members[messagerIndex].skillSet[2]));
							members[messagerIndex].balance += pay;
							bot.sendMessage({
								to: runningTimers[j].feed,
								message: 'Nice job! You\'re paid $' + pay + ' for your hard work. (' + members[messagerIndex].skillExp[2] + '/150 XP)'
							});
							
							market[members[messagerIndex].jobAt.productIndex].num++;
							
							
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
								
							bot.sendMessage({
								to: channelID,
								message: 'What is *' + translation + '* in reverse?'
							});
							members[messagerIndex].inputState = 200;
							
							insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
								
						}else{
							bot.sendMessage({
								to:runningTimers[j].feed,
								message: 'You\'ve flubbed the job. Try again:'
							});
							
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
								
							bot.sendMessage({
								to: channelID,
								message: 'What is *' + translation + '* in reverse?'
							});
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
				if(runningTimers[j].messager.memberName == members[messagerIndex].memberName){
					if(runningTimers[j].time > 0){
						if(countingPrompt == cmd){
							members[messagerIndex].skillExp[1] += 10 + members[messagerIndex].skillSet[1];
							if(members[messagerIndex].skillExp[1] >= 150){
								members[messagerIndex].skillExp[1] -= 150;
								members[messagerIndex].skillSet[1]++;
								bot.sendMessage({
									to: channelID,
									message: 'You\'ve become more familiar with this industry. Your skill in this industry increases to level ' + members[messagerIndex].skillSet[1] + '!'
								});
							}
							var pay = (members[messagerIndex].jobAt.wage * (members[messagerIndex].skillSet[1]));
							members[messagerIndex].balance += pay;
							bot.sendMessage({
								to: runningTimers[j].feed,
								message: 'Nice job! You\'re paid $' + pay + ' for your hard work. (' + members[messagerIndex].skillExp[1] + '/150 XP)'
							});
							
							market[members[messagerIndex].jobAt.productIndex].num++;
							
							var randNum = Math.floor(Math.random() * 19) + 5;
							var dots = '';
							var i;
							countingPrompt = randNum;
							for(i = 0; i < randNum; i++){
								dots += '\t.';
							}
							bot.sendMessage({
								to: channelID,
								message: 'How many dots are there?\n' + dots
							});
							members[messagerIndex].inputState = 300;
							
							insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
						
						}else{
							bot.sendMessage({
								to:runningTimers[j].feed,
								message: 'You\'ve flubbed the job. Try again:'
							});
							
							var randNum = Math.floor(Math.random() * 19) + 5;
							var dots = '';
							var i;
							countingPrompt = randNum;
							for(i = 0; i < randNum; i++){
								dots += '\t.';
							}
							bot.sendMessage({
								to: channelID,
								message: 'How many dots are there?\n' + dots
							});
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
				if(runningTimers[j].messager.memberName == members[messagerIndex].memberName){
					if(runningTimers[j].time > 0){
						if(additionPrompt == cmd){
							members[messagerIndex].skillExp[0] += 10 + members[messagerIndex].skillSet[0];
							if(members[messagerIndex].skillExp[0] >= 150){
								members[messagerIndex].skillExp[0] -= 150;
								members[messagerIndex].skillSet[0]++;
								bot.sendMessage({
									to: channelID,
									message: 'You\'ve become more familiar with this industry. Your skill in this industry increases to level ' + members[messagerIndex].skillSet[0] + '!'
								});
							}
							var pay = (members[messagerIndex].jobAt.wage * (members[messagerIndex].skillSet[0]));
							members[messagerIndex].balance += pay;
							bot.sendMessage({
								to: runningTimers[j].feed,
								message: 'Nice job! You\'re paid $' + pay + ' for your hard work. (' + members[messagerIndex].skillExp[0] + '/150 XP)'
							});
							
							market[members[messagerIndex].jobAt.productIndex].num++;
							
							var randAddendOne = Math.floor(Math.random() * 899) + 100;
						
							var randAddendTwo = Math.floor(Math.random() * 899) + 100;
						
							additionPrompt = randAddendOne + randAddendTwo;
						
							var equation = randAddendOne + ' + ' + randAddendTwo;
							
							bot.sendMessage({
								to: channelID,
								message: 'What is ' + equation + ' ?'
							});
							members[messagerIndex].inputState = 400;
						
							insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
						}else{
							bot.sendMessage({
								to:runningTimers[j].feed,
								message: 'You\'ve flubbed the job. Try again:'
							});
							
							var randAddendOne = Math.floor(Math.random() * 899) + 100;
						
							var randAddendTwo = Math.floor(Math.random() * 899) + 100;
						
							additionPrompt = randAddendOne + randAddendTwo;
						
							var equation = randAddendOne + ' + ' + randAddendTwo;
							
							bot.sendMessage({
								to: channelID,
								message: 'What is ' + equation + ' ?'
							});
							members[messagerIndex].inputState = 400;
						
							insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
						}
					}
				}
			}
			break;
	}
	}
    if (message.substring(0, 1) == prefix) {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
       
        switch(cmd) {
			case 'research':
			case 'papers':
			case 'news':
				var k;
				var inInventory = false;
				for(k = 0; k < members[messagerIndex].inventory.length; k++){
					if(members[messagerIndex].inventory[k].name == 'Paperwork'){
						if(members[messagerIndex].inventory[k].num >= 10){
							bot.sendMessage({
								to: channelID,
								message: 'Looking into imminent events..'
							});
							var newsMessage = 'There aren\'t any imminent events.';
							if(events.length > 0){
								var randEventIndex = Math.floor(Math.random() * events.length);
								newsMessage = events[randEventIndex].description;
							}
							bot.sendMessage({
								to: userID, 
								message: newsMessage
							});
							members[messagerIndex].inventory[k].num -= 10;
							inInventory = true;
							break;
						}
					}
				}
				if(inInventory == false){
					bot.sendMessage({
						to: channelID,
						message: 'You don\'t have the required amount of paperwork to find anything out!'
					});
				}
				break;
			case 'close':
				var currAuction = checkCurrentAuction();
				if(currAuction == -1){
					bot.sendMessage({
						to: channelID,
						message: 'There is no auction open at this time.'
					});
					break;
				}
				if(currAuction.seller.memberName != members[messagerIndex].memberName){
					bot.sendMessage({
						to: channelID,
						message: 'The current auction was not opened by you. Please type ' + prefix + 'auction for more information.'
					});
					break;
				}
				var currBid = checkCurrentBid();
				if(currBid == -1){
					var l;
					for(l = 0; l < members[messagerIndex].inventory.length; l++){
						if(members[messagerIndex].inventory[l].name == currAuction.item.name){
							members[messagerIndex].inventory[l].num += currAuction.amount;
						}
					}
					currentAuction = -1;
					//members[messagerIndex].balance += currBid.bid;
					bot.sendMessage({
						to: channelID,
						message: '' + members[messagerIndex].memberName + ' has closed the auction. There were no bids.'
					});
					break;
				}
				var k;
				var notFound = true;
				for(k = 0; k < currBid.bidder.inventory.length; k++){
					if(currBid.bidder.inventory[k].name == currAuction.item.name){
						currBid.bidder.inventory[k].num += currAuction.amount;
						notFound = false;
						break;
					}
				}
				if(notFound == true){
					currBid.bidder.inventory.push(new ItemSlot(currAuction.item.name, currAuction.item.price, currAuction.amount));
				}
				members[messagerIndex].balance += currBid.bid;
				bot.sendMessage({
					to: channelID,
					message: '' + members[messagerIndex].memberName + ' has closed the auction.'
				});
				currentAuction = -1;
				currentBid = -1;
				break;
			case 'bid':
				var currAuction = checkCurrentAuction();
				var bid;
				if(currAuction == -1){
					bot.sendMessage({
						to: channelID,
						message: 'No auction going on right now.'
					});
					break;
				}
				if(args.length < 2){		
					bot.sendMessage({
						to: channelID,
						message: 'Current auction was started by ' + currAuction.seller.memberName + '. It is for ' + currAuction.amount +  ' ' + currAuction.item.name + '(s), with the bidding currently at ' + currAuction.currBid + '.'
					});
					var currBid = checkCurrentBid();
					if(currBid != -1){
						bot.sendMessage({
							to: channelID,
							message: 'If the auction closed now, ' + currBid.bidder + ' would get the ' + currAuction.amount + ' ' + currAuction.item.name + '(s) for ' + currAuction.currBid + '.'
						});
					}else{
						bot.sendMessage({
							to: channelID, 
							message: 'If the auction closed now, the ' + currAuction.item.name + '(s) would return to ' + currAuction.seller.memberName + ', who opened this auction in the first place.'
						});
					}
					break;
				}else if(args.length < 3){
					if(members[messagerIndex].memberName == currAuction.seller.memberName){
						bot.sendMessage({
							to: channelID,
							message: 'You can\'t bid for your own items!'
						});
						break;
					}
					bid = parseFloat(args[1]);
					if(bid > members[messagerIndex].balance){
						bot.sendMessage({
							to: channelID,
							message: 'You can\'t bid with what you don\'t have!'
						});
						break;
					}
					currBid = checkCurrentBid();
					if(bid > currAuction.currBid || (bid == currAuction.currBid && currBid == -1)){
						currBid = checkCurrentBid();
						if(currBid != -1){
							currBid.bidder.balance += currAuction.currBid;
						}
						bot.sendMessage({
							to: channelID,
							message: 'Putting up $' + bid + ' for ' + currAuction.seller.memberName + '\'s ' + currAuction.amount + ' ' + currAuction.item.name + '(s).'
						});
						currentBid = {
							'bidder': members[messagerIndex],
							'bid': bid
						};
						currAuction.currBid = bid;
						members[messagerIndex].balance -= bid;
						break;
					}else{
						bot.sendMessage({
							to: channelID,
							message: 'Minimum bid for this auction is at ' + currAuction.currBid + '!'
						});
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
					bot.sendMessage({
						to: channelID, 
						message: 'Insufficient arguments: usage: ' + prefix + 'auction <item name> <amount> <starting bid>.'
					});
					if(currAuction != -1){
						bot.sendMessage({
							to: channelID,
							message: 'Current auction is ' + currAuction.seller.memberName + '\'s ' + currAuction.amount + ' ' + currAuction.item.name + '(s).'
						});
					}
					if(currBid != -1){
						bot.sendMessage({
							to: channelID, 
							message: 'Current bid is at ' + currBid.bid + ' by ' + currBid.bidder.memberName + '.'
						});
					}
					break;
				}else if(args.length < 3){
					itemName = args[1];
					amount = 1;
					var k;
					var inMarket = false;
					for(k = 0; k < market.length; k++){
						if(itemName == market[k].name){
							item = market[k];
							inMarket = true;
							break;
						}
					}
					if(inMarket == false){
						for(k = 0; k < exchange.length; k++){
							if(itemName == exchange[k].name){
								item = exchange[k];
								inMarket = true;
								break;
							}
						}	
					}
					if(inMarket == false){
						bot.sendMessage({
							to: channelID, 
							message: 'That is not a market item!'
						});
						break;
					}
					startBid = item.price;
					//break;
				}else if(args.length < 4){
					itemName = args[1];
					amount = parseInt(args[2]);
					var k;
					var inMarket = false;
					for(k = 0; k < market.length; k++){
						if(itemName == market[k].name){
							item = market[k];
							inMarket = true;
							break;
						}
					}
					if(inMarket == false){
						for(k = 0; k < exchange.length; k++){
							if(itemName == exchange[k].name){
								item = exchange[k];
								inMarket = true;
								break;
							}
						}	
					}
					if(inMarket == false){
						bot.sendMessage({
							to: channelID, 
							message: 'That is not a market item!'
						});
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
					for(k = 0; k < market.length; k++){
						if(itemName == market[k].name){
							item = market[k];
							inMarket = true;
							break;
						}
					}
					if(inMarket == false){
						for(k = 0; k < exchange.length; k++){
							if(itemName == exchange[k].name){
								item = exchange[k];
								inMarket = true;
								break;
							}
						}	
					}
					if(inMarket == false){
						bot.sendMessage({
							to: channelID, 
							message: 'That is not a market item!'
						});
						break;
					}
				}
				if(amount == 0){
					bot.sendMessage({
						to: channelID, 
						message: 'You can\'t put up an auction for nothing...'
					});
					break;
				}
				if(currAuction != -1){
					bot.sendMessage({
						to: channelID,
						message: 'The current auction must be closed before another can be opened.'
					});
					break;
				}
				var l;
				var dontHave = true;
				for(l = 0; l < members[messagerIndex].inventory.length; l++){
					if(itemName == members[messagerIndex].inventory[l].name){
						if(members[messagerIndex].inventory[l].num >= amount){
							members[messagerIndex].inventory[l].num -= amount;
							bot.sendMessage({
								to: channelID,
								message: 'Putting up '+ amount + ' ' + members[messagerIndex].inventory[l].name +'.'
							});
							dontHave = false;
						}
						break;
					}
				}
				
				if(dontHave == true){
					bot.sendMessage({
						to: channelID,
						message: 'You can\'t put up what you don\'t have.'
					});
					break;
				}
				bot.sendMessage({
					to: channelID, 
					message: 'Starting auction for ' + amount + ' ' + itemName + '(s)! Bidding starts at ' + startBid + '! @' + members[messagerIndex].memberName + ', type ' + prefix + 'close to close the auction and complete the transaction.'
				});
				setCurrentAuction(members[messagerIndex], item, amount, startBid);
				break;				
			case 'switchDefaultChannel':
				bot.sendMessage({
					to: channelID,
					message: '*Default channel switched from ' + defaultChannel + ' to ' + channelID + '*'
				});
				defaultChannel = channelID;
				break;
            case 'help':
                bot.sendMessage({
                    to: channelID,
                    message: getHelpMessage()
                });
				break;
			case 'update':
				bot.sendMessage({
					to: channelID, 
					message: getUpdateMessage(user)
				});
				break;
			case 'whoami':
				bot.sendMessage({
					to: channelID,
					message: 'You are ' + user + '!'
				});
				break;
			case 'setprefix':
				if(args.length < 2){
					bot.sendMessage({
						to: channelID, 
						message: 'Insufficient arguments: usage: ' + prefix + 'setprefix <prefix symbol>.'
					});
					break;
				}
				prefix = args[1].substring(0, 1);
				bot.sendMessage({
					to: channelID, 
					message: 'Prefix changed to ' + prefix + '.'
				});
				break;
			case 'buy':
				if(args.length < 2){
					bot.sendMessage({
						to: channelID, 
						message: 'Insufficient arguments: usage: ' + prefix + 'buy <item name> <amount>.'
					});
					break;
				}
				var itemName = args[1];
				var amount = 1;
				if(args.length > 2){
					if(isNaN(args[2]) == true){
						bot.sendMessage({
							to: channelID, 
							message: 'usage: ' + prefix + 'buy <item name> <amount>.'
						});
						break;
					}
					amount = parseInt(args[2]);
				}
				var attempt = addItem(user, itemName, amount);
				
				switch(attempt){
					case 0:
						if(isNaN(itemName) == false && (parseInt(itemName) - 1 >= 0 && parseInt(itemName) - 1 < exchange.length + market.length)){
							if(itemName - 1 > market.length){
								itemName -= market.length;
								itemName = exchange[itemName - 1].name;
							}else{
								itemName = market[itemName - 1].name;
							}
							bot.sendMessage({
								to: channelID,
								message: '' + user + ' bought ' + amount + ' ' + itemName + '(s).'
							});
						}else{
							bot.sendMessage({
								to: channelID, 
								message: '' + user + ' bought ' + amount + ' ' +itemName+'(s).'
							});
						}
						break;
					case -1:
						bot.sendMessage({
							to: channelID, 
							message: 'No member with the name ' + user + ' has been found!'
						});
						break;
					case -2:
						if(isNaN(itemName) == false && (parseInt(itemName) - 1 >= 0 && parseInt(itemName) - 1 < exchange.length + market.length)){
							if(itemName - 1 > market.length){
								itemName -= market.length;
								itemName = exchange[itemName - 1].name;
							}else{
								itemName = market[itemName - 1].name;
							}
						}
						bot.sendMessage({
							to: channelID,
							message: 'There aren\'t/isn\'t even ' + amount + ' ' + itemName + '(s) in the market!'
						});
						break;
					case -3:
						if(isNaN(itemName) == false && (parseInt(itemName) - 1 >= 0 && parseInt(itemName) - 1 < exchange.length + market.length)){
							if(itemName - 1 > market.length){
								itemName -= market.length;
								itemName = exchange[itemName - 1].name;
							}else{
								itemName = market[itemName - 1].name;
							}
						}
						bot.sendMessage({
							to: channelID,
							message: 'Can\'t afford ' + amount + ' ' + itemName + '(s)!'
						});
						break;
				}
				break;
			case 'market':
				bot.sendMessage({
					to: channelID,
					message: listMarket()
				});
				break;
			case 'work':
				if(args.length < 2){
					var output = 'What business are you working for?```';
					var i;
					for(i = 0; i < industries.length; i++){
						output += '\n '+(i+1)+'.\t'+industries[i].name;
					}
					output += '```';
					bot.sendMessage({
						to: channelID,
						message: output
					});
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
								
								bot.sendMessage({
									to: channelID,
									message: 'What is ' + equation + '?'
								});
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
								bot.sendMessage({
									to: channelID,
									message: 'How many dots are there?\n' + dots
								});
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
								
								bot.sendMessage({
									to: channelID,
									message: 'What is ' + translation + ' in reverse?'
								});
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
								bot.sendMessage({
									to: channelID,
									message: 'Name the item: :' + namingPrompt
								});
								members[messagerIndex].inputState = 100;
								
								insertTimer(10, channelID, 'Shift over!', members[messagerIndex]);
								break;
						}
						break;
					}else{
						switch(attempt){
							case -1:
								bot.sendMessage({
									to: channelID,
									message: 'That business doesn\'t exist! Please pick a real business.'
								});
								break;
							default:
								break;
						}
						break;
					}
				}
			case 'balance':
				var output = '```';
				output += members[messagerIndex].memberName + ': \n\tbalance: $' + members[messagerIndex].balance + '\n\tinventory:\n';
				var j;
				for(j = 0; j < members[messagerIndex].inventory.length; j++){
					output += '\t\t'+members[messagerIndex].inventory[j].name+': '+members[messagerIndex].inventory[j].num+'\n';
				}
				output += '```';
				bot.sendMessage({
					to: channelID,
					message: output
				});
				break;
			default:
				if(cmd == 'register' || cmd == 'hello')
					break;
				bot.sendMessage({
					to: channelID,
					message: 'No such command. Please see ' + prefix + 'help.'
				});
		}
	 }

});