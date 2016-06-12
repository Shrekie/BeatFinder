var audioManager = (function(){
	
	/*
		Does the recording of audio on current tab,
		converts it to file extension acceptable by server side identify script.
		Passes file to server side
	*/	
	
	var streamObject = {}; // the current stream object
	var mediaRecorder = {}; // current blob object
	var lastFoundSong = null; // the last found song, displayed if popup closes
	var recordTime = 8; // Seconds to record audio
	
	var isRecording = false;
	
	var saveRecentSongs = (function(){
		
		/*
			Stores a small cache of songs listened to previously on the chrome user.
		*/
		
		var numberOfSongs = 5; // The number of songs stored.
		var recentSongs = {lastSongsData:{lastSongs:[]}}; //The songs saved
		var hasSongs = false;
		var historyJson = null;
		
		var initLocalVar = function (callback){
			
			// Sets local variables to users chrome data.
			
			chrome.storage.sync.get("songArray", function (items) {
				
				saveRecentSongs.lastSongsData = {lastSongs:items.songArray};
				if(saveRecentSongs.lastSongsData.lastSongs == null)
					saveRecentSongs.lastSongsData.lastSongs = [];
				if(saveRecentSongs.lastSongsData.lastSongs.length > 0){
					saveRecentSongs.lastSongs=true
				}
				
				callback();
				
			});
			
		}
		
		var chromeSave = function(parsedSongData){
			
			// Saves data to chrome user
			
			saveRecentSongs.lastSongsData.lastSongs.unshift({parsedObject:parsedSongData});
			
			//Only as many as specified
			if(saveRecentSongs.lastSongsData.lastSongs.length > numberOfSongs)
				saveRecentSongs.lastSongsData.lastSongs.pop();
			
			chrome.storage.sync.set({
			"songArray": saveRecentSongs.lastSongsData.lastSongs,
			}, function () {
				chrome.runtime.sendMessage({order: "foundHistoryInfo",lastSongsData:audioManager.saveRecentSongs.lastSongsData});
			});
			
		}
		
		var saveSong = function(parsedSongData){
			
			var seen = false;
			$.each(saveRecentSongs.lastSongsData.lastSongs,function(index, val){
				if(parsedSongData.metadata.music[0].title == val.parsedObject.metadata.music[0].title){
					seen = true;
				}
			});
			
			if(!seen){
				chromeSave(parsedSongData);
			}
			
			initLocalVar(function(){});
			
		};
		
		var getSongMetadata = function(songName){
			$.each(saveRecentSongs.lastSongsData.lastSongs,function(index, val){
				if(songName == val.parsedObject.metadata.music[0].title){
					chrome.runtime.sendMessage({order: "insertAudioDataDontRemoveLoading",audioStringData:val.parsedObject});
				}
			});
		}
		
		return{
			saveSong:saveSong,
			lastSongs:hasSongs,
			lastSongsData:recentSongs.lastSongsData,
			initLocalVar:initLocalVar,
			getSongMetadata:getSongMetadata
		};
		
		
		initLocalVar(function(){});
		
	})();
	
	var uploadBlob = function(wavBlob){
		
		/*
			Uploads wav file to server and waits for audio check
		*/
		
		chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
			
			if (chrome.runtime.lastError) {
				
				console.log(chrome.runtime.lastError.message);
				audioManager.isRecording = false;
				chrome.runtime.sendMessage({order: "logIntoChrome"});
				
			} else {
				var fd = new FormData();
				fd.append('token', token);
				fd.append('fname', 'test');
				fd.append('data', wavBlob);
				
				$.ajax({
					type: 'POST',
					url: 'URL_AUTH_AND_RECOGNIZE',
					data: fd,
					processData: false,
					contentType: false,
					success:function(data){
						parseRetrievedData(data);
					},
					error:function(error) {
						parseRetrievedData("{\"status\":{\"msg\":\"fail\"}}");
					}
				});		
				
			}
		});
	};
	
	var parseRetrievedData = function(data){
		
		/*
			Data retrieved by the server, send to popup
		*/
		
		audioManager.isRecording = false;
		
		var parsedObjectStringData = $.parseJSON(data);
		
		if(parsedObjectStringData.status.msg == "fail"){
			chrome.runtime.sendMessage({order: "pleaseTryAgain"});
		}
		else if(parsedObjectStringData.status.msg == "Success"){
			
			audioManager.lastFoundSong = parsedObjectStringData;
			chrome.runtime.sendMessage({order: "insertAudioData",audioStringData:parsedObjectStringData});
			saveRecentSongs.saveSong(parsedObjectStringData);
			
		}
		else{
			chrome.runtime.sendMessage({order: "nothingFound"});
		}
		
	};
	
	var stopCapture = function(){
		
		/*
			Stops the capture of audio
		*/
		
		mediaRecorder.stop();
		streamObject.getAudioTracks()[0].stop();
		
	};
 
	var captureStream = function(){
		
		audioManager.lastFoundSong = null; // remove last found song
		
		// Starts the capture of the current tab
		audioManager.isRecording = true;
		
		chrome.tabCapture.capture({
		audio : true,
		video : false
		}, function(stream){
			
			// continue to play this audio stream
			var audio = new Audio(window.URL.createObjectURL(stream));
			audio.play();
			
			// create blob
			streamObject = stream;
			
			mediaRecorder = new MediaStreamRecorder(streamObject);
			mediaRecorder.mimeType = 'audio/webm';
			
			mediaRecorder.ondataavailable = function (blob) {
				uploadBlob(blob);
				stopCapture();
			};
			
			mediaRecorder.start(recordTime*1000);
		});
		
	};
	
	return{
		captureStream:captureStream,
		stopCapture:stopCapture,
		isRecording:isRecording,
		lastFoundSong:lastFoundSong,
		saveRecentSongs:saveRecentSongs
	};
	
})();

//Entry point of all messages sent to background.
chrome.runtime.onMessage.addListener(

  function(request, sender, sendResponse) {
	
	if(request.order == "sendSongData"){

		audioManager.saveRecentSongs.getSongMetadata(request.songTitle);

	}	
	  
	if(request.order == "checkStatus"){
		
		audioManager.saveRecentSongs.initLocalVar(function(){
			chrome.runtime.sendMessage({order: "foundHistoryInfo",lastSongsData:audioManager.saveRecentSongs.lastSongsData});
		});
		
		sendResponse({isRecording:audioManager.isRecording,lastFoundSong:audioManager.lastFoundSong});

	}
	
	if(request.order == "captureStream"){

		if(!audioManager.isRecording){
			
			chrome.tabs.query({active:true,currentWindow:true},function(tabArray){
			
				if (tabArray[0] == null){
					chrome.runtime.sendMessage({order: "lostFocus"});
				}
				else if (tabArray[0].url == null){
					
					// Lost focus of current tab
					chrome.runtime.sendMessage({order: "lostFocus"});
					
				}else{
					
					audioManager.captureStream();	
				
				}
				
			});
			
		}else{
			chrome.runtime.sendMessage({order: "stillLoading"});
		}
	}
	
    
 });