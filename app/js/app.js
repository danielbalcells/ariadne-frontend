'use strict';

angular.module('myApp', [])
    .controller('AriadneController', function($scope, $http){
        //var cytoscape = require(['js/cytoscape']);
        //var jquery = require(['js/jquery']);
        //var cyqtip = require(['js/cytoscape-qtip']);
        //cyqtip( cytoscape ); // register extension
        requirejs.config({
            baseUrl: 'js/',
            paths: {
                // the left side is the module ID,
                // the right side is the path to
                // the jQuery file, relative to baseUrl.
                // Also, the path should NOT include
                // the '.js' file extension. This example
                // is using jQuery 1.9.0 located at
                // js/lib/jquery-1.9.0.js, relative to
                // the HTML page.
            }
        });
        require(['cytoscape', 'jquery', 'cytoscape-qtip','jquery-qtip'],
        function(cytoscape, jquery, cyqtip, jqueryqtip){
            jquery(jqueryqtip);
            cyqtip(cytoscape, jquery);
            var dictGIDToCytoID = {};
            var haveStartingKnot = false;
            $scope.serverURL = 'http://localhost:5010/';

            var cy = cytoscape({
                container: document.getElementById('cy'), // container to render in
                style: [
                    // Nodes
                    {
                        selector: 'node',
                        style: {
                            'width': '100px',
                            'height': '100px',
                            //'content': 'data(recName)',
                            'font-size': '15px',
                            'text-valign': 'bottom',
                            'text-halign': 'center',
                            'text-outline-opacity': function(ele){
                                if(ele.data('highlighted')){
                                    return 1;
                                }
                                else{
                                    return 0.8;
                                }
                            },
                            'text-outline-width': function(ele){
                                if(ele.data('highlighted')){
                                    return 2;
                                }
                                else{
                                    return 1;
                                }
                            },
                            'color': '#fff',
                            'overlay-opacity': '0',
                            'background-blacken': function(ele){
                                if(ele.data('highlighted')){
                                    return 0;
                                }
                                else{
                                    return 0.7;
                                }
                            },
                            'text-opacity': function(ele){
                                if(ele.data('highlighted')){
                                    return 1;
                                }
                                else{
                                    return 0.8;
                                }
                            },
                            'background-color': function(ele){
                                var color;
                                if(ele.incomers('edge').data('type')){
                                    switch(ele.incomers('edge').data('type')){
                                        case 'ThreadBySameArtist':
                                            color='#20ddae';
                                            break;
                                        case 'ThreadByGroupPersonIsMemberOf':
                                            color='#ddca20';
                                            break;
                                        case 'ThreadByGroupMemberSoloAct':
                                            color='#ddca20';
                                            break;
                                        case 'ThreadByGroupWithMembersInCommon':
                                            color='#f6822e';
                                            break;
                                        case 'ThreadByArtistWithFestivalInCommon':
                                            color='#dd20be';
                                            break;
                                        default:
                                        length=400;
                                    }
                                }
                                else{
                                    color= '#20ddae';
                                }

                                return color;
                            },
                            // 'background-color': function (ele){
                            //     if (ele.data('artworkURL')) {
                            //         return undefined;
                            //     }
                            //     else {
                            //         return '#ddca20';
                            //     }
                            // },
                            'background-fit': 'cover'
                        }
                    },
                    // Edges
                    {
                        selector: 'edge',
                        style: {
                            'line-color': function(ele){
                                var color;
                                switch(ele.data('type')){
                                    case 'ThreadBySameArtist':
                                        color='#20ddae';
                                        break;
                                    case 'ThreadByGroupPersonIsMemberOf':
                                        color='#ddca20';
                                        break;
                                    case 'ThreadByGroupMemberSoloAct':
                                        color='#ddca20';
                                        break;
                                    case 'ThreadByGroupWithMembersInCommon':
                                        color='#f6822e';
                                        break;
                                    case 'ThreadByArtistWithFestivalInCommon':
                                        color='#dd20be';
                                        break;
                                    default:
                                    length=400;
                                }
                                return color;
                            },
                            'opacity': function(ele){
                                if(ele.data('highlighted')){
                                    return 1;
                                }
                                else{
                                    return 0.3;
                                }
                            },
                            'width': function(ele){
                                if(ele.data('thick')){
                                    return 16;
                                }
                                else{
                                    return 4;
                                }
                            }
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
                knotData.artworkURL = false;
                knotData.highRepulsion = false;
                knotData.highlighted = true;
                var knot = cy.add({
                    group: "nodes",
                    data: knotData,
                    position: {x: position[0], y:position[1]}
                });
                // knot.data('artworkURL',false);
                // knot.data('highRepulsion',false);
                // knot.data('highlighted', true);
                setArtworkURL(knot, knotData.releaseGroupGID);

                // Add tooltip
                knot.qtip({
                    content: {
                        title: knot.data('recName'),
                        text: knot.data('creditedArtists') + '</br><i>' + knot.data('releaseGroup') + '</i>'
                    },
                    show: {
                        event: 'mouseover'
                    },
                    hide: {
                        event: 'mouseout'
                    },
                    style: {
                        classes: 'qtip-bootstrap'
                    }
                });

                return knot;
            }

            function addThread(threadData){
                threadData.source = threadData.fromKnot.id;
                threadData.target = threadData.toKnot.id;

                var thread = cy.add({
                    group: "edges",
                    data: threadData
                });

                thread.data('highlighted',true);
                thread.data('thick', false);

                // Add tooltip
                var qtipText;
                switch(thread.data('type')){
                    case 'ThreadBySameArtist':
                        qtipText='Also by ' + thread.data('artist');
                        break;
                    case 'ThreadByGroupPersonIsMemberOf':
                        qtipText=thread.data('fromPerson') + ' played in </br>'
                            + thread.data('toGroup');
                        if (thread.data('memberPerformsAs') != thread.data('fromPerson') &&
                            thread.data('memberPerformsAs').length > 0){
                            qtipText = qtipText + ', and performs as '+ '</br>' + thread.data('memberPerformsAs');
                        }
                        break;
                    case 'ThreadByGroupMemberSoloAct':
                        qtipText=thread.data('memberInCommon') + ' played in </br>'
                            + thread.data('fromGroup');
                        if (thread.data('memberPerformsAs') != thread.data('memberInCommon')&&
                            thread.data('memberPerformsAs').length > 0){
                            qtipText = qtipText + ', and performs as ' +'</br>' + thread.data('memberPerformsAs');
                        }
                        break;
                    case 'ThreadByGroupWithMembersInCommon':
                        qtipText=thread.data('memberInCommon') + ' played in both </br>'
                            + thread.data('fromGroup') + ' and </br>'
                            + thread.data('toGroup');
                        break;
                    case 'ThreadByArtistWithFestivalInCommon':
                        qtipText=thread.data('fromArtist') + ' and </br>' + thread.data('toArtist')
                            + ' both played in festival </br>' + thread.data('festival')
                        break;
                    default:
                    length=400;
                }

                thread.qtip({
                    content: {
                        text: qtipText
                    },
                    show: {
                        event: 'mouseover'
                    },
                    hide: {
                        event: 'mouseout'
                    },
                    style: {
                        classes: 'qtip-bootstrap'
                    }
                });

                return thread;
            }

            function addThreadsOn(thisKnot){
                cy.nodes().lock();
                cy.nodes().data('highRepulsion',true);
                thisKnot.data('highRepulsion',false);
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
                                        var newKnotPos = positionCloseTo(thisKnot.position(),5);
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
                                    //coseLayout(thisKnot);
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
                padding: 60, // padding on fit
                circle: true, // put depths in concentric circles if true, put depths top down if false
                spacingFactor: 1.2, // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
                boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
                avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
                nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
                roots: undefined, // the roots of the trees
                maximalAdjustments: 10, // how many times to try to position the nodes in a maximal way (i.e. no backtracking)
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
                                eles: thisKnot.closedNeighborhood(),
                                padding: 60
                            }},{
                                duration: 500
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
                    nodeRepulsion: function( node ){
                        var repulsion;
                        if (node.data('highRepulsion')){
                            repulsion = 200000;
                        }
                        else{
                            repulsion = 20;
                        }
                        return repulsion;
                    },
                    // Node repulsion (overlapping) multiplier
                    nodeOverlap: 4,
                    // Ideal edge (non nested) length
                    idealEdgeLength: function( edge ){
                        var length=0;
                        switch(edge.data('type')){
                            case 'ThreadBySameArtist':
                                length=5;
                                break;
                            case 'ThreadByGroupPersonIsMemberOf':
                                length=10;
                                break;
                            case 'ThreadByGroupMemberSoloAct':
                                length=10;
                                break;
                            case 'ThreadByGroupWithMembersInCommon':
                                length=100;
                                break;
                            case 'ThreadByArtistWithFestivalInCommon':
                            length=200;
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

            function setArtworkURL(knot, releaseGroupGID){
                $http.get(
                    'http://coverartarchive.org/release-group/'+releaseGroupGID)
                .then(function successCallback(response){
                        knot.css('background-image', response.data.images[0].image);
                    }, function errorCallback(response){
                        knot.css('background-image', undefined);
                    }
                )
            }

            // Add Threads to Knot on mouse tap
            cy.on('tap', 'node', function(evt){
                var thisKnot = evt.target;
                addThreadsOn(thisKnot);
            });

            // Highlight Knot and closed neighborhood on mouseover
            cy.on('mouseover','node', function(evt){
                var thisKnot = evt.target;
                cy.elements().data('highlighted', false);
                thisKnot.closedNeighborhood().data('highlighted', true);
                thisKnot.connectedEdges().data('thick',true);
            });

            cy.on('mouseout','node', function(evt){
                var thisKnot = evt.target;
                cy.elements().data('highlighted', true);
                thisKnot.connectedEdges().data('thick',false);
            });

            // Highlight Thread and connected Knots on mouseover
            cy.on('mouseover','edge', function(evt){
                var thisEdge = evt.target;
                cy.elements().data('highlighted', false);
                thisEdge.data('highlighted', true);
                thisEdge.data('thick', true);
                thisEdge.connectedNodes().data('highlighted', true);
            });

            cy.on('mouseout','edge', function(evt){
                var thisEdge = evt.target;
                cy.elements().data('highlighted', true);
                thisEdge.data('thick', false);
            });

            cy.on('cxttap', 'node', function(evt){
                var thisElem = evt.target;
                thisElem.remove();
            })

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


    });
