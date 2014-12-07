/////////////////////////////////////////////
/*
  SARAH project, 
  basic functions for js plugins
  Author:Alban Vidal-Naquet
  Date: 22/11/2013
*/

/////////////////////////////////////////////
const gs_sep="§";
const gs_defaultsarahname="SARAH";

function init(func)
{
    if (typeof(global.debuglist)=="undefined")
        global.debuglist=new Array();
   global.debuglist[__dirname]=func;
   return this;
}

function release()
{
}

function myrequest(data, callbackfunc, timeoutfunc, timeout)
{
  var request=require("request");
  // default timeout is 60 seconds
  var to=60;
  // arm the trigger
  var arm=1;
  // new timeout ?
  if (typeof(timeout)!="undefined")
    to=timeout;
  setTimeout(function()
             {
                // if trigger setted then call timeoutfunc
                if (arm==1)
                    return timeoutfunc();
             }, 
             to*1000);
  // do the request
  request(data, function(err, response, body)
                {
                    // request done, disarm trigger
                    arm=0;
                    // then call the native callback function
                    return callbackfunc(err, response, body);
                });
}

// Function speak needed with SARAH v3.X because SARAH.speak function doesn't support concomitant call
function speak(content, SARAH)
{
    if (typeof SARAH.context.isspeaking==="undefined")
	{
		SARAH.context.isspeaking=false;
		SARAH.context.tospeak=new Array();
	}
	if (SARAH.context.isspeaking==true || SARAH.context.tospeak.length>0)
		SARAH.context.tospeak.push(content);
	else
	{
		SARAH.context.isspeaking=true;
		SARAH.speak(content,
					function checkSpeak()
					{
						SARAH.context.isspeaking=false;
						if (SARAH.context.tospeak.length>=1)
						{
							SARAH.context.isspeaking=true;
							var txt=SARAH.context.tospeak[0];
							SARAH.context.tospeak.shift();
							SARAH.speak(txt, checkSpeak);
						}
					});
	}
}

var exec=function(command, callback, arg1, arg2)
{
    var exec = require('child_process').exec;
	var child = exec(command, function (error, stdout, stderr) 
						{
							if (typeof callback!=="undefined")
								callback(arg1, arg2, error, stdout, stderr);
						});
	return child;
}

var chooseSentence=function(tts);
{
    var r="";
	var choices=tts+"";
	var res = choices.split("|");
	if (res.length==1)
        r=tts;
	else
        r=res[Math.floor(Math.random()*res.length)];
    return r;
}

function speakR(tts, cb, SARAH)
{
    var r=chooseSentence(tts);
    if (cb==0 || cb=="")
        SARAH.speak(r);
    else
        SARAH.speak(r,cb);
}

function getMSecondsFromNow(unit, number)
{
  var d=new Date();
  var n=new Date();
  var inc=0;
  switch(unit)
  {
	case "D":
		inc=24*60*60*1000*number;
		d.setTime(d.getTime()+inc);
		d.setHours(0);
		d.setMinutes(0);
		d.setSeconds(1);
		break;
    case "H":
		inc=60*60*1000*number;
		d.setTime(d.getTime()+inc);
		d.setMinutes(0);
		d.setSeconds(1);
		break;
	case "M":
		inc=60*1000*number;
		d.setTime(d.getTime()+inc);
		d.setSeconds(1);
		break;
	case "S":
		inc=1000*number;
		d.setTime(d.getTime()+inc);
		break;
	default:
		console.log("getMSecondsFromNow: Unknown unit "+unit);
		break;
  }
  return d.getTime()-n.getTime();
}

var replaceSectionInFile=function(patternfile, destfile, sectiontagnumber, replacetext)
{
	var fs   = require('fs');
	if (fs.existsSync(patternfile))
	{
		var content    = fs.readFileSync(patternfile,'utf8');
		var tag        = gs_sep + sectiontagnumber + "[^" + gs_sep + "]+" + gs_sep + sectiontagnumber;
		var regexp     = new RegExp(tag,'gm');
		var newcontent = content.replace(regexp, gs_sep + sectiontagnumber + " -->\n" + replacetext + "<!-- " + gs_sep + sectiontagnumber);
		fs.writeFileSync(destfile, newcontent, 'utf8');
		return 0;
	}
	return -1;
}

var getSpeaker=function(data, ignoreunknow, loc)
{
  if (typeof data.profile!=="undefined")
  {
    if (ignoreunknow==false)
		return data.profile;
	else
	  if (data.profile.search("Unknow")==-1)
	  {
	    if (typeof loc!=="undefined")
			loc.addDictEntry("SPK", data.profile);
	    return data.profile;
	  }
  }
  return "";
}

var convertUTF8toASCII=function( str )
{
	var code, i = 0;
	var ret="";
	var s=0;

	while( !isNaN( code = str.charCodeAt(i) ) ) 
	{
		if( s==0 && (65 <= code && code <= 90 ||
			97 <= code && code <= 122 ||
			48 <= code && code <= 57 ||
			45 <= code && code <= 46 ||
			code === 95 || code==39 || code==44 || code==41 || code==91 || code==93 ||
			code === 126 || code==32 || code==10 || code==58 || code==40))
			ret+=str.charAt(i);
		else
		{
			  var c="";
			  switch(code)
			  {
				case 171:
				case 187:
					s=0;
					c='"';
					break;
				case 226:
					c="-";
					break;
				case 160:
					// if s==1 mode then it's ' ', else its 'à'
					if (s==2) 
						c=String.fromCharCode(str.charCodeAt(i)+64);
					if (s==1)
						c=' ';
					s=0;
					break;
				case 195:
					s=2;
					//c="@("+code+","+str.charCodeAt(i+1)+")";
					break;
				case 194:
					s=1;
					//c="@("+code+","+str.charCodeAt(i+1)+")";
					break;
				case 169:
				case 171:
				case 187:
				default:
					if (s>0 && 129<=code && code<=192 && code!=171 && code!=187)
						c=String.fromCharCode(str.charCodeAt(i)+64);
					else
						c=str.charAt(i);
					s=0;
					break;
			  }
			  if (c!="")
			  {
				//console.log(c+" "+code);
				ret+=c;
			  }
				
			}
		i++;
	}
    // remove all empty line
	var re=new RegExp(/\n\n/g);
	ret=ret.replace(re, "");
    // add a point at each end of line which are not ending by a point
	re=new RegExp(/([^\.])\n/g);
	ret=ret.replace(re,"$1.\n");
    // Remove all empty phrase
	re=new RegExp(/^[ ]*.\n/g);
	return ret.replace(re, "");
}

var sendRequest = function(url, cb, arg, data, callback, config, SARAH, cberror)
{
	var request = require('request');
	request({ 'uri' : url, 'headers':{'Accept-Charset':'utf-8'},'encoding':'binary'}, 
			function (err, response, body)
			{
				if (err || response.statusCode != 200) 
				{
					console.log("url " + url + " failed");
                    if (typeof(cberror)=="function")
                        cberror(err, response, arg, data, callback, config, SARAH);
					return -1;
				}
				if (typeof cb!=="undefined" && cb!=0)
					cb(arg, body, data, callback, config, SARAH);
			});
	return 0;
}

function speakWithPause(content_array, pause_duration, SARAH)
{
    function NextSpeak(index)
    {
       if (index<content_array.length)
            setTimeout(function()
                          {
                            SARAH.speak(content_array[index], 
							            function(){NextSpeak(index+1);});
                          },
                        pause_duration);
    }
    if (content_array.length>0)
        SARAH.speak(content_array[0], function(){NextSpeak(1);}); 
}

function zp(num, places)
{
  // Zero leading pad
  var zero = places - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join("0") + num;
}

var formatDate=function(d, mode)
{
  if (typeof(global.loc)=="undefined" && typeof(global.loc.init)!="function")
  {
    console.log("*** basicfunction.js: require customloc.js");
    return ;
  }
  // MONTH#Janvier~Février~Mars~Avril~Mai~Juin~Juillet~Aout~Septembre~Octobre~Novembre~Décembre
  var cs_month=global.def[__dirname].getLocalStringAndSplit("MONTH");
  // DAY#Dimanche~Lundi~Mardi~Mercredi~Jeudi~Vendredi~Samedi
  var cs_day=global.def[__dirname].getLocalStringAndSplit("DAY");
  // NEARDAY#Aujourd'hui~Demain~Après demain
  var cs_nearday=global.def[__dirname].getLocalStringAndSplit("NEARDAY");
  var str="";
  switch(mode)
  {
	case 0:	
		// to text to log
		str=zp(d.getDate(),2)+"/"+zp(d.getMonth()+1,2)+"/"+d.getFullYear()+" "+zp(d.getHours(),2)+":"+zp(d.getMinutes(),2);
		break;
	case 1:
	    // to text to vocalize, mode simple
		global.def[__dirname].addDictEntry("DAY", d.getDate());
		global.def[__dirname].addDictEntry("MONTH", cs_month[d.getMonth()]);
		global.def[__dirname].addDictEntry("YEAR", d.getFullYear());
		global.def[__dirname].addDictEntry("HOURS", d.getHours());
		global.def[__dirname].addDictEntry("MINUTES", d.getMinutes());
		if (d.getMinutes()>0)
			// FORMATDATE1A#%DAY% %MONTH% %YEAR% à %HOURS% heures et %MINUTES% minutes
			str=global.def[__dirname].getLocalString("FORMATDATE1A");
		else
			// FORMATDATE1B#%DAY% %MONTH% %YEAR% à %HOURS% heures
			str=global.def[__dirname].getLocalString("FORMATDATE1B");
		//str=d.getDate()+" "+cs_month[d.getMonth()]+" "+d.getFullYear()+" à "+d.getHours()+" heures ";
		//if (d.getMinutes()>0)
		//	str+="et "+d.getMinutes()+" minutes";
		break;
	case 2:
	    // to text to vocalize, mode complete
		var n=new Date();
		global.def[__dirname].addDictEntry("WEEKDAY", cs_day[d.getDay()]);
		global.def[__dirname].addDictEntry("DAY", d.getDate());
		global.def[__dirname].addDictEntry("MONTH", cs_month[d.getMonth()]);
		global.def[__dirname].addDictEntry("HOURS", d.getHours());
		global.def[__dirname].addDictEntry("MINUTES", d.getMinutes());
		// FORMATDATE2A1#le %WEEKDAY% %DAY %MONTH%,
		var compday=global.def[__dirname].getLocalString("FORMATDATE2A1");
		if (d.getDate()-n.getDate()<cs_nearday.length)
		{
		  global.def[__dirname].addDictEntry("DAY", cs_nearday[d.getDate()-n.getDate()]);
		  // FORMATDATE2A2#%DAY%,
		  compday=global.def[__dirname].getLocalString("FORMATDATE2A2");
		}
		global.def[__dirname].addDictEntry("COMPLETEDAY", compday);
		if (d.getMinutes()>0)
			// FORMATDATE2B1#%COMPLETEDAY% à %HOURS% heures
			str=global.def[__dirname].getLocalString("FORMATDATE2B1");
		else
			// FORMATDATE2B2#%COMPLETEDAY% à %HOURS% heures et %MINUTES% minutes
			str=global.def[__dirname].getLocalString("FORMATDATE2B2");
		break;
	case 3:
		// to text to vocalize, only hours and minutes
		global.def[__dirname].addDictEntry("HOURS", d.getHours());
		global.def[__dirname].addDictEntry("MINUTES", d.getMinutes());
		if (d.getMinutes()>0)
			// FORMATDATE3A#%HOURS% heure et %MINUTES% minutes
			str=global.def[__dirname].getLocalString("FORMATDATE3A");
		else
			// FORMATDATE3B#%HOURS% heure
			str=global.def[__dirname].getLocalString("FORMATDATE3B");
/*
		str=d.getHours()+ " heure ";
		if (d.getMinutes()>0)
			str+="et "+d.getMinutes()+" minutes";
*/
		break;
	case 4:
		// as mode 0 but with seconds
		str=zp(d.getDate(),2)+"/"+zp(d.getMonth()+1,2)+"/"+d.getFullYear()+" "+zp(d.getHours(),2)+":"+zp(d.getMinutes(),2)+":"+zp(d.getSeconds(),2);
		break;
	case 5:
	    // to text to vocalize, mode complete
		var n=new Date();
		global.def[__dirname].addDictEntry("WEEKDAY", cs_day[d.getDay()]);
		global.def[__dirname].addDictEntry("DAY", d.getDate());
		global.def[__dirname].addDictEntry("MONTH", cs_month[d.getMonth()]);
		global.def[__dirname].addDictEntry("HOURS", d.getHours());
		global.def[__dirname].addDictEntry("MINUTES", d.getMinutes());
		// FORMATDATE2A1#le %WEEKDAY% %DAY %MONTH%,
		str=global.def[__dirname].getLocalString("FORMATDATE5A");
		break;
  }
  return str;
}

function log(file, content, toconsole)
{
    if (typeof(global.loc)=="undefined" && typeof(global.loc.init)!="function")
    {
        console.log("*** basicfunction.js: require customloc.js");
        return ;
    }
    var date=new Date();
	var d=formatDate(date, 4);
	var fs=require("fs");
  	fs.appendFileSync(__dirname+"\\"+file, d+" "+content+"\n");
	if (typeof toconsole!=="undefined" && toconsole==true)
		console.log(d+" "+file+":"+content);
}

function sendProwl(SARAH, who, title, msg, name, cb)
{
    var url="http://localhost:8080/sarah/push";
    
    if (typeof(GetConfig(SARAH).modules.push)=="undefined")
    {
        console.log("sendProwl: push modules not found, aborting msg send");
        return -1;
    }
    url=url+"?silent=1&who="+who+"&title="+title+"&msg="+msg;
    if (typeof(name)!="undefined")
      url=url+="&name="+name;
    var request = require('request');
    request(
                { 'uri' : url }, 
                function (err, response, body)
                {
                    if (typeof(cb)!="undefined")
                        cb(err, responde, body);
                }
            );
    return 0;
}

function debug(lvl, obj, tofile)
{
    var dbg="";
    
    if (typeof(global.loc)=="undefined" && typeof(global.loc.init)!="function")
    {
        console.log("*** basicfunction.js: require customloc.js");
        return ;
    }
    var date=new Date();
	var d=formatDate(date, 4);
    if (typeof(global.debuglist[__dirname])=="function")
        dbg=global.debuglist[__dirname]();
	if (dbg=="")
		if (typeof(tofile)=="undefined" || tofile!=1)
			console.log(d+":"+obj);
		else	
		{
			var txt=obj;
			var fs=require("fs");
			if (typeof(obj)=="object")
			  txt=JSON.stringify(obj);
			fs.appendFileSync(__dirname+"\\debug.txt", d+":"+txt+"\n");
		}
	else if ((dbg&lvl)!=0)
		if (typeof(tofile)=="undefined" || tofile!=1)
			console.log(d+":"+obj);
		else
		{
			var txt=obj;
			var fs=require("fs");
			if (typeof(obj)=="object")
			  txt=JSON.stringify(obj);
			fs.appendFileSync(__dirname+"\\debug.txt", d+":"+txt+"\n");
		}
    return 0;
}

function debugF(lvl, obj)
{
    return debug(lvl, obj, 1);
}

var LoadContext=function()
{
    var fs   = require('fs');
    var filename=__dirname+"\\context.json";
	if (fs.existsSync(filename))
	{
		var content = fs.readFileSync(filename,'utf8');
        return JSON.parse(content);
    }
    return 0;
}

var SaveContext=function(path)
{
    var fs   = require('fs');
    var filename=__dirname+"\\context.json";
    var content=JSON.stringify(path);
	fs.writeFileSync(filename, content, 'utf8');
    return 0;
}

var GetConfig=function(SARAH)
{
  switch(GetSARAHVersion(SARAH))
  {
    case "4.0":
		return Config;
		break;
	case "3.X":
	case "2.8":
	    return SARAH.ConfigManager.getConfig();
		break;
	default:
	  console.log("basicfunction.GetConfig: Unknown SARAH version");
  }
  return {};
}

var GetSARAHVersion=function(SARAH)
{
   if (typeof(SARAH.pause)!="function")
     return "4.0";
   if (typeof(SARAH.context)=="undefined")
     return "2.8";
   return "3.X";
}

var GetSARAHName=function(SARAH)
{
	var fs   = require('fs');
	var pathconfig="";
	switch (GetSARAHVersion(SARAH))
	{
		case "4.0":
			pathconfig="client/custom.ini";
			break;
		case "2.8":
		case "3.X":
		default:
			pathconfig="custom.ini";
			break;
	}
	var content = fs.readFileSync(pathconfig,'utf8');
	var regexp  = new RegExp("\\s*name\\s*=\\s*(.*)",'i');
	var res=regexp.exec(content);
	if (res.length>0)
	  return res[1];
	return gs_defaultsarahname;
}

var existsSync=function(filePath)
{
    try
    {
        var fs=require('fs');
        fs.statSync(filePath);
    }
    catch(err)
    {
        if(err.code == 'ENOENT') 
            return false;
    }
    return true;
}

var IsWindows=function()
{
    if (existsSync(__dirname+"\\basicfunctions.js"))
        return true;
    return false;
}

exports.init=init;
exports.release=release;
exports.getSpeaker=getSpeaker;
exports.sendRequest=sendRequest;
exports.replaceSectionInFile=replaceSectionInFile;
exports.speak=speak;
exports.exec=exec;
exports.getMSecondsFromNow=getMSecondsFromNow;
exports.speakR=speakR;
exports.formatDate=formatDate;
exports.log=log;
exports.speakWithPause=speakWithPause;
exports.convertUTF8toASCII=convertUTF8toASCII;
exports.sendProwl=sendProwl;
exports.debug=debug;
exports.debugF=debugF;
exports.LoadContext=LoadContext;
exports.SaveContext=SaveContext;
exports.myrequest=myrequest;
exports.GetConfig=GetConfig;
exports.GetSarahVersion=GetSARAHVersion;
exports.GetSARAHName=GetSARAHName;
exports.existsSync=existsSync;
exports.IsWindows=IsWindows;
exports.chooseSentence=chooseSentence;
