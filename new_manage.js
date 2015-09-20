var apply = function(scope) {
	if(!scope.$root.$$phase) {
		scope.$apply();
	}
};

var setAuth = (function() {
	var auth;
	var onAuth = [];
	
	function sendAuth() {
		var authEvent = document.createEvent("CustomEvent");
		authEvent.initCustomEvent("auth", true, true, auth);
		document.dispatchEvent(authEvent);
	}
	
	function setAuth(newAuth) {
		auth = newAuth;
		sendAuth();
	}
	
	window.addEventListener("getAuth", function(event){
		sendAuth();
	});
	
	return setAuth;
})();

var mod = angular.module("stylishShare", []);
mod.controller("rootCtrl", function($scope) {
	var ref = new Firebase("https://stylish-share.firebaseio.com/");
	$scope.authenticated = false;
	$scope.auth;
	
	var writeRef;
	
	ref.onAuth(function(auth) {
		$scope.authenticated = !!auth;
		$scope.auth = auth;
		if(writeRef) {
			writeRef.off("value", allOurData);
		}
		if(auth) {
			writeRef = ref.child("userData").child(auth.uid);
			writeRef.on("value", allOurData);
		}
		
		if(auth) {
			setAuth(auth.auth.uid);
		}
		
		apply($scope);
	});
	$scope.login = function() {
		ref.authWithOAuthPopup("google", function(error, authData) {
			if (error) {
				console.log("Login Failed!", error);
			} else {
				console.log("Authenticated successfully with payload:", authData);
			}
		});
	};
	$scope.logout = function() {
		ref.unauth();
	};
	
	//Eh... not going to be that much, lets just read it all at once
	function allOurData(snapshot) {
		$scope.data = snapshot.val();
		apply($scope);
	}
	
	function getReadRef(userUID) {
		return ref.child("userData").child(userUID);
	}
	function getStyleRef(style, userUID) {
		var readRef = writeRef;
		if(userUID) {
			readRef = getReadRef(userUID);
		}
		return readRef.child("styles").child(style.styleID);
	}
	
	$scope.addStyle = function() {
		var styleRef = writeRef.child("styles").push({
			createDate: Firebase.ServerValue.TIMESTAMP,
			content: ""
		});
		styleRef.child("styleID").set(styleRef.key());
	};
	$scope.save = function(style) {
		var styleRef = getStyleRef(style);
		styleRef.set(style);
	};
	$scope.bindNull1 = function(fnc, arg) {
		return fnc.bind(null, arg);
	};
	$scope.delete = function(style) {
		if(confirm("Sure you want to delete " + style.content)) {
			var styleRef = getStyleRef(style);
			styleRef.child("deleted").set(true);
		}
	};
	$scope.lines = function(text) {
		if(!text) return 1;
		return text.split("\n").length;	
	};
	
	$scope.addUrl = function(style, value) {
		var styleRef = getStyleRef(style);
		styleRef.child("urls").push(value);
	};
	
	$scope.updateUrl = function(style, key, value) {
		var styleRef = getStyleRef(style);
		styleRef.child("urls").child(key).set(value);
	};
	
	$scope.toggleEnableStyle = function(style) {
		var data = $scope.data;
		writeRef.child("enabled").child(style.styleID).set(!(data.enabled && data.enabled[style.styleID]));
	};
});

mod.directive("cssEditor", function(){
	return {
		template: "<div class='code'></div>",
		scope: {
			content: "=",
			style: "=",
			save: "=",
			lastSaved: "=?",
			changed: "=?"
		},
		link: function link(scope, elements, attrs) {
			scope.content = scope.content || "";
			var lastSavedContent;
			scope.$watch("lastSaved", function(lastSaved){
				lastSavedContent = lastSaved;
				scope.changed = false;
			});
			var originalContent = scope.content;
			scope.$watch("content", function(content){
				scope.changed = content != originalContent && content != lastSavedContent;
			});
			var editor = CodeMirror(elements[0], {
				mode: "text/css",
				lineNumbers: true,
				extraKeys: {
					"Ctrl-Space": "autocomplete",
					"Ctrl-S": function() {
						scope.save(scope.style);
						scope.lastSaved = scope.content;
						apply(scope);
					}
				},
				value: originalContent
			});
			editor.on("change", function(cm){
				scope.content = cm.getValue();
				apply(scope);
			});
		}
	}
});

//http://eric.sau.pe/angularjs-detect-enter-key-ngenter/
mod.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
 
                event.preventDefault();
            }
        });
    };
});

/*
var editor = CodeMirror(document.getElementById("code"), {
	mode: "text/css",
	lineNumbers: true,
	extraKeys: {"Ctrl-Space": "autocomplete"},
	value: 'a{}'
});

editor.setValue("x");

editor.on("keyup", function(x, e) {
	var keyCode = e.keyCode;
	//letters
	if(65 <= keyCode && keyCode <= 90) {
		CodeMirror.showHint(editor);
	}
});

var ref = new Firebase("https://stylish-share.firebaseio.com/");
ref.authWithOAuthPopup("google", function(error, authData) {
  if (error) {
    console.log("Login Failed!", error);
  } else {
    console.log("Authenticated successfully with payload:", authData);
  }
});
*/