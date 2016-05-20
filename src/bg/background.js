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
	
	var uploadBlob = function(wavBlob){
		/*
			Uploads wav file to server and waits for audio check
		*/
		
		chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
				var fd = new FormData();
				fd.append('token', token);
				fd.append('fname', 'test.wav');
				fd.append('data', wavBlob);
				$.ajax({
					type: 'POST',
					url: 'URL_AUTH_AND_RECOGNIZE',
					data: fd,
					processData: false,
					contentType: false,
					success:function(data){
						parseRetrievedData(data)
					},
					error:function(error) {
						parseRetrievedData("{\"status\":{\"msg\":\"fail\"}}");
					}
				});	
		});
		
	};
	
	var parseRetrievedData = function(data){
		
		/*
			Data retrieved by the server, send to popup
		*/
		var parsedObjectStringData = $.parseJSON(data);
		
		if(parsedObjectStringData.status.msg == "fail"){
			chrome.runtime.sendMessage({order: "pleaseTryAgain"});
		}
		else if(parsedObjectStringData.status.msg == "Success"){
			audioManager.lastFoundSong = parsedObjectStringData;
			chrome.runtime.sendMessage({order: "insertAudioData",audioStringData:parsedObjectStringData});
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
		audioManager.isRecording = false;
		
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
			mediaRecorder.mimeType = 'audio/wav';
			
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
		lastFoundSong:lastFoundSong
	}
	
})();






//Entry point of all messages sent to background.
chrome.runtime.onMessage.addListener(

  function(request, sender, sendResponse) {
	  
	if(request.order == "checkStatus"){

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
					tabArray[0]
					chrome.runtime.sendMessage({order: "lostFocus"});
					
				}else{
					
					audioManager.captureStream();	
				
				}
				
			});
			
		}
	}
	
    
 });