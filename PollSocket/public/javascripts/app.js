'use strict';

angular.module("polls", ['ngResource', 'ngRoute'])
	.config(function($routeProvider){
		
		$routeProvider
			.when("/polls",{
					templateUrl : "partials/list.html",
					controller : "PollListController"
				})
			.when("/poll/:pollId",{
				templateUrl : "partials/item.html",
				controller : "PollItemController"
			})
			.when("/new",{
				templateUrl : "partials/new.html",
				controller : "PollNewController"
			})
			.otherwise({
				redirectTo : "/polls"
			});
		
	})
	
	.controller("PollListController", function($scope, Poll){
		$scope.polls = Poll.query();
	})
	
	.controller("PollItemController", function($scope, Poll, $routeParams, Socket){
		
		$scope.poll = Poll.get({
			pollId : $routeParams.pollId
		});
		
		Socket.on('myvote', function(data){
			
			if(data.id === $routeParams.pollId){
				$scope.poll = data;
			}
		});
		
		Socket.on('vote', function(data){
			
			if(data.id === $routeParams.pollId){
				$scope.poll.choices = data.choices;
				$scope.poll.totalVotes = data.totalVotes;
			}
		});
		
		$scope.vote = function(){
			
			var pollId = $scope.poll._id, choiceId = $scope.poll.userVote;
			if(choiceId){
				var voteObj = {poll_id : pollId, choice: choiceId};
				Socket.emit('send:vote', voteObj);
			}else{
				alert("You must select an option to vote for");
			}
			
		};
	})
	
	.controller("PollNewController", function($scope, $location, Poll){

		var empty = {text : ""};

		$scope.poll = {
			question : "",
			choices : [{text : ""}, {text : ""}, {text : ""}]
		};

		$scope.addChoice = function(){
			$scope.poll.choices.push({text : ""});
		};
		
		$scope.createPoll = function(){
			var poll = $scope.poll
			if(poll.question.length > 0){
				var choiceCount = 0;
				for(var i = 0, In = poll.choices.length; i < In; i++){
					var choice = poll.choices[i];
					if(choice.text.length > 0){
						choiceCount++;
					}
				}
				if(choiceCount > 1){
					var newPoll = new Poll(poll);
					newPoll.$save(function(p, resp){
						if(!p.error){
							$location.path('polls');
						}else{
							alert('Could not create poll');
						}
					});
				}else{
					alert("You must enter at lease two choices");
				}
			}else{
				alert("You must enter a question");
			}
		};
		
	})
	
	.factory("Poll", function($resource){
		
		return $resource('polls/:pollId', {}, {
			query : {
				method : 'GET',
				params : {
					pollId : 'polls'
				},
				isArray : true
			}
		});
	})
	
	
	.factory("Socket", function($rootScope){
		
		var socket = io.connect();
		
		return {
			on: function(eventName, callback){
				socket.on(eventName, function(){
					var args = arguments;
					$rootScope.$apply(function(){
						callback.apply(socket, args);
					});
				});
			},
			emit: function(eventName, data, callback){
				socket.emit(eventName, data, function(){
					var arg = arguments;
					$rootScope.$apply(function(){
						if(callback){
							callback.apply(socket, arg);
						}
					});
				});
			}
		}
	})