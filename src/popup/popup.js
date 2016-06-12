$(window).load(function(){
	
	var popupUtil =(function(){
		
		/* 
			Inserts audio data to display,
		*/
		
		var sourceTemplateSongInfo = $("#songInfoTemplate").html();
		var sourceTemplateSongInfoTemplate = Handlebars.compile(sourceTemplateSongInfo);
		
		var sourceTemplateHistoryInfo = $("#historyTemplate").html();
		var sourceTemplateHistoryInfoTemplate = Handlebars.compile(sourceTemplateHistoryInfo);
		
		var displayText = function(textString){
			
			$("#audioInfo").html("<div>"+textString+"</div>")
			$("#audioInfo").slideDown("slow");
			$("#HistoryList").slideDown("slow");
			
		};
		
		var insertAudioData = function(audioDataInput){
			
			var audioInfoHTML = sourceTemplateSongInfoTemplate(audioDataInput);
			$("#audioInfo").html(audioInfoHTML);	
			$("#audioInfo").slideDown("slow");
			$("#HistoryList").slideDown("slow");
			
		};
		
		var insertHistoryData = function(historyData){
			
			var historyInfoHTML = sourceTemplateHistoryInfoTemplate(historyData);
			
			$("#HistoryList").html(historyInfoHTML);	
			$("#HistoryList").slideDown("slow");
			
			$(".previewSong").click(function(){
				chrome.runtime.sendMessage({order: "sendSongData",songTitle:$(this).find(".artistNamePreviewhidden").text()});
			})
			
		};
		
		var startRecord = function(onlyGraphical){
			
			chrome.tabs.query({active:true,currentWindow:true},function(tabArray){
				$("#logoFlip").flip("toggle");
				
				// If tab is already being captured, only show graphical elements
				if(!onlyGraphical){
					chrome.runtime.sendMessage({order: "captureStream"});
				}

				$("#loading-anim").fadeIn("slow");
				$("#audioInfo").slideUp( "slow", function() {});
				
			});
		};
		
		return{
			displayText:displayText,
			insertAudioData:insertAudioData,
			startRecord:startRecord,
			insertHistoryData:insertHistoryData
		};
		
	})();
		
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


	chrome.runtime.onMessage.addListener(

	  function(request, sender, sendResponse) {
		
		if(request.order == "foundHistoryInfo"){
			popupUtil.insertHistoryData(request.lastSongsData);
		}
		
		if(request.order == "lostFocus"){
			$("#loading-anim").fadeOut("slow");
			popupUtil.displayText("Lost focus on this tab, please click inside window first.");
		}
		
		if(request.order == "pleaseTryAgain"){
			$("#loading-anim").fadeOut("slow");
			popupUtil.displayText("Please try again");
		}
		
		if(request.order == "nothingFound"){
			$("#loading-anim").fadeOut("slow");
			popupUtil.displayText("Nothing found for this audio sample");
		}
		
		if(request.order == "insertAudioData"){
			$("#loading-anim").fadeOut("slow");
			$("#logoFlip").flip("toggle");
			popupUtil.insertAudioData(request.audioStringData);
			
		}
		
		if(request.order == "insertAudioDataDontRemoveLoading"){
			$("#logoFlip").flip("toggle");
			popupUtil.insertAudioData(request.audioStringData);
			
		}
		
		if(request.order == "logIntoChrome"){
			$("#loading-anim").fadeOut("slow");
		}
		
		if(request.order == "stillLoading"){
			
			popupUtil.displayText("Still waiting for response, this should take 8-15 seconds. </br></br>Make sure you are logged into the Chrome browser: <a  id=\"chromeLogin\" href=\"#\">chrome://chrome-signin/</a>");
			
			$("#chromeLogin").click(function(){
				chrome.tabs.create({url:'chrome://chrome-signin/'});
			})
			
		}
	});
 
 });