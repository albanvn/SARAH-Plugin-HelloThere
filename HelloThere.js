/*************************
  SARAH-Plugin-HelloThere
  Author: Alban Vidal-Naquet
  Date: 07/12/2014
  Description:
    HelloThere Plugin for SARAH project (see http://encausse.wordpress.com/s-a-r-a-h/)
	
**************************/

/*****************************
  TODO LIST:
    -
******************************/

var g_debug=0;
var loc=0;
var bf=0;

const gs_midday=16;
const gs_resethello=4;

var g_peopleSeen=new Array();

exports.init = function(SARAH)
{
	var config=SARAH.ConfigManager.getConfig();
	config=config.modules.HelloThere;
    loc=require("./customloc.js").init(__dirname);
    bf=require("./basicfunctions.js").init(function(){return g_debug;})
	// Set next daily reset people seen
    setTimeout(resetPeople, bf.getMSecondsFromNow("D", 1)+(gs_resethello*60*60*1000));
}

function resetPeople()
{
    g_peopleSeen=new Array();
}

var checkPeople=function(name)
{
    var value=1;
    var dt=new Date();
    
    if (name.search("unknow")!=-1)
        return -1;
    if (name.search("Unknow")!=-1)
        return -1;
    if (dt.getHours()>gs_midday)
        value=2;
    if (name in g_peopleSeen)
        if ((g_peopleSeen[name]&value)!=0)
            value=0;
        else
            g_peopleSeen[name]|=value;
    else
        g_peopleSeen[name]|=value;
    return value;
}

exports.standBy = function(motion, data, SARAH)
{
    if (motion==true)
    {
        var txt="";
        switch (checkPeople(data.profile))
        {
            case 1:
                txt=loc.getLocalString("IDMORNING");
                break;
            case 2:
                txt=loc.getLocalString("IDEVENING");
                break;
            default:
                break;
        }
        if (txt!="")
            bf.speakR(txt,0,SARAH);
    }
}

exports.reload=function(SARAH)
{
    loc.release();
    bf.release();
}

exports.release = function(SARAH)
{
    loc.release();
    bf.release();
}

exports.action = function(data, callback, config, SARAH)
{
    var txt="";
	var config=config.modules.HelloThere;
    
	if ((g_debug&2)!=0)
		console.log(data);
    switch (checkPeople(data.profile))
    {
        case 1:
            txt=log.getLocalString("IDMORNING");
            break;
        case 2:
            txt=log.getLocalString("IDEVENING");
            break;
        case -1:
            // Unknown people
            break;
        default:
        case 0:
            txt=loc.getLocalString("IDALREADYSEEN");
            break;
    }
	callback({'tts': bf.chooseSentence(txt)});
}

