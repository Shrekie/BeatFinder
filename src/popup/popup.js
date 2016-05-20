var popupUtil =(function(){
	
	/* 
		Inserts audio data to display,
	*/

	
	//Init
	var sourceTemplate = $("#songInfoTemplate").html();
	var template = Handlebars.compile(sourceTemplate);
	
	var displayText = function(textString){
		$("#audioInfo").html("<div>"+textString+"</div>")
		$("#audioInfo").slideDown("slow");
	}
	
	var insertAudioData = function(audioData){
		
		var audioInfoHTML = template({audioData:audioData});
			
		$("#audioInfo").html(audioInfoHTML);	
		$("#audioInfo").slideDown("slow");

	}
	
	var startRecord = function(onlyGraphical){
		
		chrome.tabs.query({active:true,currentWindow:true},function(tabArray){
			$("#logoFlip").flip("toggle");
			// If tab is already being captured, only show graphical elements
			if(!onlyGraphical){
				chrome.runtime.sendMessage({order: "captureStream"});
			}

			$("#loading-anim").fadeIn("slow");
			//$("#ACRCloudLogo").fadeIn("slow");
			$("#audioInfo").slideUp( "slow", function() {});
			
		});
	}
	
	return{
		displayText:displayText,
		insertAudioData:insertAudioData,
		startRecord:startRecord
	}
	
})();


$(window).load(function(){
	$("#logoFlip").flip({
	  trigger: 'manual'
	});
	
		// Bind events
	$("#logoFlip").click(function(){
		
		chrome.tabs.query({active:true,currentWindow:true},function(tabArray){
			popupUtil.startRecord(false);
		});
		
	});
	
	
	chrome.runtime.sendMessage({order: "checkStatus"}, function(response){
		
		// restores old status
		
		if(response.isRecording){
			popupUtil.startRecord(true);
		}
		
		if(response.lastFoundSong != null){
			popupUtil.insertAudioData(response.lastFoundSong);
		}
		
	});
});

chrome.runtime.onMessage.addListener(

  function(request, sender, sendResponse) {
	
	if(request.order == "lostFocus"){
		$("#loading-anim").fadeOut("slow");
		$("#audioInfo").html("<div>Lost focus on this tab, please click inside window first.</div>")
		$("#audioInfo").slideDown("slow");
	}
	
	if(request.order == "pleaseTryAgain"){
		$("#loading-anim").fadeOut("slow");
		$("#ACRCloudLogo").fadeOut("slow");
		popupUtil.displayText("Please try again");
	}
	
	if(request.order == "nothingFound"){
		$("#loading-anim").fadeOut("slow");
		$("#ACRCloudLogo").fadeOut("slow");
		popupUtil.displayText("Nothing found for this audio sample");
	}
	
	// Insert new generated audio into div
	if(request.order == "insertAudioData"){
		
		$("#loading-anim").fadeOut("slow");
		$("#logoFlip").flip(false);
		popupUtil.insertAudioData(request.audioStringData);
		
	}
	
    
 });