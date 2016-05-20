<?php
	
	/*
		A ajax client call to a url with this file on it.
	*/
	
	function sendAudioFile(){	
		$requrl = "http://eu-west-1.api.acrcloud.com/v1/identify";
		$http_method = "POST";
		$http_uri = "/v1/identify";
		$data_type = "audio";
		$signature_version = "1" ;
		$timestamp = time() ;
		
		/*
		Get these from https://www.acrcloud.com/
		$access_key =  '';
		$access_secret =  '';
		*/
		
		$string_to_sign = $http_method . "\n" . 
						  $http_uri ."\n" . 
						  $access_key . "\n" . 
						  $data_type . "\n" . 
						  $signature_version . "\n" . 
						  $timestamp;
						  
		$signature = hash_hmac("sha1", $string_to_sign, $access_secret, true);
		$signature = base64_encode($signature);
		
		
		$filePath = realpath($_FILES["data"]["tmp_name"]);
		
		$filesize = filesize($filePath);
		
		$cfile = new CURLFile($filePath, "wav");
		$postfields = array(
					   "sample" => $cfile, 
					   "sample_bytes"=>$filesize, 
					   "access_key"=>$access_key, 
					   "data_type"=>$data_type, 
					   "signature"=>$signature, 
					   "signature_version"=>$signature_version, 
					   "timestamp"=>$timestamp);
					   
		$ch = curl_init();
		
		curl_setopt($ch, CURLOPT_URL, $requrl);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $postfields);
		
		$response = curl_exec($ch);
		
		if ($response == true) {
			$info = curl_getinfo($ch);
		} else {
			$errmsg = curl_error($ch);
			print $errmsg;
		}
		
		curl_close($ch);
	}
	
	function authenticate_google_OAuthtoken($token)
	{

		$url = 'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token='.$token;
		
		$ch = curl_init();	
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		$response = curl_exec($ch);	
		curl_close($ch);
		
		$responseJson = json_decode($response);
		
		if($responseJson->aud ==
		/*
			When verifying a token, it is critical to ensure the audience field in the response exactly matches the client ID that you obtained in the Developers Console. 
			It is absolutely vital to perform this step, because it is the mitigation for the confused deputy issue.	
		*/
		{
			sendAudioFile();
		}
		else if(isset($responseJson->error))
		{
			echo $responseJson->error;
		}
	}
	
	$googleToken = $_POST["token"];
	authenticate_google_OAuthtoken($googleToken);
	
?>