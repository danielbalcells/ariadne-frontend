'use strict';

angular.module('myApp', [])
    .controller('AriadneController', function($scope, $http){

        var dictGIDToCytoID = {};
        var haveStartingKnot = false;
        $scope.serverURL = 'http://localhost:5010/';

        var cy = cytoscape({
            container: document.getElementById('cy'), // container to render in
            style: [
                {
                    selector: 'node',
                    style: {
                        'width': '75px',
                        'height': '75px',
                        'content': 'data(recName)',
                        'font-size': '15px',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'text-outline-color': '#555',
                        'text-outline-width': '2px',
                        'color': '#fff',
                        'overlay-opacity': '0'
                    }
                }
            ],

        });

        function initBackend(){
            $http.get($scope.serverURL)
            .then(function successCallback(response){
                $scope.ariadneStatus = "Connected";
            }, function errorCallback(response){
                $scope.ariadneStatus = response.data;
            });
        }

        function addKnot(knotData, position){
            dictGIDToCytoID[knotData.recGID] = knotData.id;
            return cy.add({
                group: "nodes",
                data: knotData,
                position: {x: position[0], y:position[1]}
            });
        }

        function addThread(threadData){
            threadData.source = threadData.fromKnot.id;
            threadData.target = threadData.toKnot.id;

            var thread = cy.add({
                group: "edges",
                data: threadData
            });
            return thread;
        }

        function addThreadsOn(thisKnot){
            cy.nodes().lock();
            $http.post($scope.serverURL + 'move-current-knot',
                JSON.stringify({'knotID': thisKnot.id()}))
                .then(function successCallback(response){
                    $scope.ariadneStatus = 'Fetching connections...';
                    $http.post($scope.serverURL + 'get-best-threads')
                        .then(function successCallback(response){
                            $scope.ariadneStatus = 'Click on a song to find connections.';
                            var threads = response.data;
                            var edges = [];
                            for(var i=0; i<threads.length; i++){
                                // Add Knot if not already existing
                                if (!dictGIDToCytoID[threads[i].toKnot.recGID]){
                                    var newKnotPos = positionCloseTo(thisKnot.position(),150);
                                    addKnot(threads[i].toKnot, [newKnotPos.x,newKnotPos.y]);
                                }
                                // If already existing, change knot ID to point to previous one
                                else{
                                    threads[i].toKnot.id = dictGIDToCytoID[threads[i].toKnot.recGID];
                                }
                                var t = addThread(threads[i]);
                                edges.push(t);
                            }
                            if (!haveStartingKnot){
                                breadthFirstLayout();
                                haveStartingKnot = true;
                            }
                            else {
                                coseLayout(thisKnot);
                            }

                        }, function errorCallback(response){
                            $scope.ariadneStatus = 'No connections found for this song. Click on another song to find connections.';
                        });
                });
        }

        function positionCloseTo(originalPos, scale){
            var xShift = (Math.random()-0.5)*2*scale;
            var yShift = (Math.random()-0.5)*2*scale;
            return {x: originalPos.x+xShift, y:originalPos.y+yShift};
        }

        function breadthFirstLayout(){

            var options = {
            name: 'breadthfirst',

            fit: true, // whether to fit the viewport to the graph
            directed: false, // whether the tree is directed downwards (or edges can point in any direction if false)
            padding: 30, // padding on fit
            circle: true, // put depths in concentric circles if true, put depths top down if false
            spacingFactor: 1, // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
            boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
            avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
            nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
            roots: undefined, // the roots of the trees
            maximalAdjustments: 0, // how many times to try to position the nodes in a maximal way (i.e. no backtracking)
            animate:true,
            animationDuration: 500, // duration of animation in ms if enabled
            animationEasing: undefined, // easing of animation if enabled,
            animateFilter: function ( node, i ){ return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
            ready: undefined, // callback on layoutready
            stop: function(){cy.nodes().unlock();}, // callback on layoutstop
            transform: undefined // transform a given node position. Useful for changing flow direction in discrete layouts
            };

            var lay = cy.layout( options );
            lay.run();
        }

        function randomGraphLayout(){
            var options = {
            name: 'random',

            fit: false, // whether to fit to viewport
            padding: 30, // fit padding
            boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
            animate: true, // whether to transition the node positions
            animationDuration: 500, // duration of animation in ms if enabled
            animationEasing: undefined, // easing of animation if enabled
            animateFilter: function ( node, i ){ return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
            ready: undefined, // callback on layoutready
            stop: undefined, // callback on layoutstop
            transform: undefined// transform a given node position. Useful for changing flow direction in discrete layouts
            };

            var lay = cy.layout( options );
            lay.run();
        }

        function nullLayout(){
            var options = {
                name: 'null',

                ready: function(){}, // on layoutready
                stop: function(){} // on layoutstop
            };

            var lay = cy.layout( options );
            lay.run();
        }

        function coseLayout(thisKnot){
            var options = {
                name: 'cose',
                // Called on `layoutready`
                ready: function(){},
                // Called on `layoutstop`
                stop: function(){
                    cy.animate({
                        fit:{
                            eles: thisKnot.closedNeighborhood()
                        }},{
                            duration: 500
                        },{
                            padding: 100
                        }
                    );
                    cy.nodes().unlock();
                },
                /*stop: function(finalCenterKnot){
                    cy.animate({
                        fit:{
                            eles: finalCenterKnot,
                            padding: 40
                        },
                        duration: 500
                    });
                    //cy.fit(finalCenterKnot)
                },*/
                // Whether to animate while running the layout
                // true : Animate continuously as the layout is running
                // false : Just show the end result
                // 'end' : Animate with the end result, from the initial positions to the end positions
                animate: 'end',
                // Easing of the animation for animate:'end'
                animationEasing: undefined,
                // The duration of the animation for animate:'end'
                animationDuration: 500,
                // A function that determines whether the node should be animated
                // All nodes animated by default on animate enabled
                // Non-animated nodes are positioned immediately when the layout starts
                animateFilter: function ( node, i ){ return true; },
                // The layout animates only after this many milliseconds for animate:true
                // (prevents flashing on fast runs)
                animationThreshold: 0,
                // Number of iterations between consecutive screen positions update
                // (0 -> only updated on the end)
                refresh: 25,
                // Whether to fit the network view after when done
                fit: false,
                // Padding on fit
                padding: 30,
                // Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
                boundingBox: undefined,
                // Excludes the label when calculating node bounding boxes for the layout algorithm
                nodeDimensionsIncludeLabels: false,
                // Randomize the initial positions of the nodes (true) or use existing positions (false)
                randomize: false,
                // Extra spacing between components in non-compound graphs
                componentSpacing: 40,
                // Node repulsion (non overlapping) multiplier
                nodeRepulsion: function( node ){ return 200; },
                // Node repulsion (overlapping) multiplier
                nodeOverlap: 4,
                // Ideal edge (non nested) length
                idealEdgeLength: function( edge ){
                    var length=0;
                    switch(edge.data('type')){
                        case 'ThreadBySameArtist':
                            length=10;
                            break;
                        case 'ThreadByGroupPersonIsMemberOf':
                            length=50;
                            break;
                        case 'ThreadByGroupMemberSoloAct':
                            length=50;
                            break;
                        case 'ThreadByGroupWithMembersInCommon':
                        length=200;
                            break;
                        case 'ThreadByArtistWithFestivalInCommon':
                        length=400;
                            break;
                        default:
                        length=400;
                    }
                    return length;
                },
                // Divisor to compute edge forces
                edgeElasticity: function( edge ){
                    var elasticity=0;
                    switch(edge.data('type')){
                        case 'ThreadBySameArtist':
                            elasticity=2;
                            break;
                        case 'ThreadByGroupPersonIsMemberOf':
                            elasticity=4000;
                            break;
                        case 'ThreadByGroupMemberSoloAct':
                            elasticity=4000;
                            break;
                        case 'ThreadByGroupWithMembersInCommon':
                        elasticity=10000;
                            break;
                        case 'ThreadByArtistWithFestivalInCommon':
                        elasticity=20000;
                            break;
                        default:
                        elasticity=40000;
                    }
                    return 400;
                },
                // Nesting factor (multiplier) to compute ideal edge length for nested edges
                nestingFactor: 1.2,
                // Gravity force (constant)
                gravity: 10,
                // Maximum number of iterations to perform
                numIter: 1000,
                // Initial temperature (maximum node displacement)
                initialTemp: 1000,
                // Cooling factor (how the temperature is reduced between consecutive iterations
                coolingFactor: 0.99,
                // Lower temperature threshold (below this point the layout will end)
                minTemp: 1.0,
                // Pass a reference to weaver to use threads for calculations
                weaver: false
            };

            var lay = cy.layout(options);
            lay.run();
        }

        cy.on('tap', 'node', function(evt){
            var thisKnot = evt.target;
            addThreadsOn(thisKnot);
        });

        $scope.$watch('initialRecordingMBID', function() {
            //POST input-recording
            cy.remove('node');
            $http.post($scope.serverURL + "input-recording",
                JSON.stringify({"MBID": $scope.initialRecordingMBID}))
                .then(function successCallback(response){
                    // add a Knot with the received data
                    var thisKnot = addKnot(response.data, [Math.round(cy.width()/2),Math.round(cy.height()/2)]);
                    // add Threads on this knot
                    addThreadsOn(thisKnot);
                    $scope.ariadneStatus = response.data.recName;
            }, function errorCallback(response){
                $scope.ariadneStatus = "Something went wrong."
            });

        });

        $scope.ariadneStatus = 'Connecting...';
        initBackend();
        $scope.initialRecordingMBID = "084a24a9-b289-4584-9fb5-1ca0f7500eb3";
    });
