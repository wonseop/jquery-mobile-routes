/*!
 * jQuery mobile routes plugin v0.1.0 - Copyright (c) 2013 Wonseop Kim
 * Released under MIT license
 */

( function ( $, window ) {
	var document = window.document,
		// Original code: https://bitbucket.org/wyatt/dijkstra.js(MIT license)
		// Thanks Wyatt Baldwin
		PriorityQueue = {
			make: function ( opts ) {
				var T = this,
					t = {},
					key;

				opts = opts || {};

				for ( key in T ) {
					t[key] = T[key];
				}

				t.queue = [];
				t.sorter = function ( a, b ) {
					return a.cost - b.cost;
				};

				return t;
			},

			/**
			* Add a new item to the queue and ensure the highest priority element
			* is at the front of the queue.
			*/
			push: function ( value, cost ) {
				var item = { value: value, cost: cost };

				this.queue.push( item );
				this.queue.sort( this.sorter );
			},

			/**
			* Return the highest priority element in the queue.
			*/
			pop: function () {
				return this.queue.shift();
			},

			empty: function () {
				return this.queue.length === 0;
			}
		};

	$.widget( "mobile.routes", $.mobile.widget, {
		options: {
			language: null,
			db: null,
			gridLine: false,
			margin: 10,
			interval: 1,
			initSelector: ":jqmData(role='routes')"
		},

		_svgNS: 'http://www.w3.org/2000/svg',
		_svg: null,

		_gridRange: [],
		_data: {},
		_leftTop: [],
		_rightBottom: [],
		_languageData: null,
		_lines: [],
		_stations: [],
		_stationsMap: [],
		_graph: {},
		_transperList: [],

		_create: function () {
			var self = this,
				view = self.element,
				svgContainer = $( "<div>" ).appendTo( view );

			svgContainer.addClass( "ui-routes-svg ui-routes-container" );

			self._svg = $( document.createElementNS( this._svgNS, "svg" ) )
				.attr( {
					'version': '1.1',
					'width': "100%",
					'height': "100%"
				} ).appendTo( svgContainer )[0];

			view.addClass( "ui-routes" );

			$.each( this.options, function ( key, value ) {
				self.options[ key ] = undefined;
				self._setOption( key, value );
			});

			if ( document.readyState === "complete" ) {
				self.refresh( true );
			}
		},

		_setOption: function ( key, value ) {
			var self = this,
				option = self.options,
				data;

			$.mobile.widget.prototype._setOption.apply( this, arguments );
			switch ( key ) {
			case "db":
				if ( value.match(/\.(json)$/i) ) {
					$.ajax({
						async: false,
						global: false,
						dataType: 'JSON',
						url : option.db
					}).done( function ( result ) {
						data = result;
					}).fail( function ( e ) {
						throw new Error( e );
					});
				} else {
					data = window[value];
				}
				self._processData( data );
				break;

			case "language":
				data = option.db;
				if ( !data || !data.match(/\.(json)$/i) ) {
					return;
				}

				if ( !value ) {
					this._languageData = null;
					return;
				}

				data = data.substring( data.lastIndexOf("\\") + 1, data.lastIndexOf(".") ) +
						"." + value + "." + data.substring( data.lastIndexOf(".") + 1, data.length );
				$.ajax({
					async: false,
					global: false,
					dataType: 'JSON',
					url : data
				}).done( function ( result ) {
					self._languageData = result;
				});
				break;
			}
		},

		_clear: function () {
			while ( this._svg.firstChild ) {
				this._svg.removeChild( this._svg.firstChild );
			}
		},

		_processData: function ( data ) {
			var i, j, k,
				lines = data.lines,
				options = this.options,
				interval = options.interval,
				margin = options.margin,
				branches,
				branch,
				station,
				stationStyle,
				stationRadius = data.stationRadius,
				stationFont = data.stationFont,
				exchangeStyle = data.exchangeStyle,
				exchangeRadius = data.exchangeRadius,
				exchangeFont = data.exchangeFont,
				lineStyle,
				coord,
				minX = 9999,
				minY = 9999,
				maxX = 0,
				maxY = 0,
				xPosPrev = -1,
				yPosPrev = -1,
				xPos = 0,
				yPos = 0,
				linePath,
				control1,
				control2,
				controlPoint = [],
				graph= {},
				convertCoord = function ( pos ) {
					return ( margin + interval * pos );
				};

			this._data = data;

			for ( i = 0; i < lines.length; i += 1 ) {
				branches = lines[i].stations;
				stationStyle = lines[i].style.station;
				lineStyle = lines[i].style.line;
				for ( j = 0; j < branches.length; j += 1 ) {
					branch = branches[j];
					linePath = "";
					for ( k = 0; k < branch.length; k += 1 ) {
						station = branch[k];
						coord = station.coordinates;

						if ( graph[station.label.text] === undefined ) {
							graph[station.label.text] = {};
						}

						if ( branch[k - 1] !== undefined ) {
							graph[station.label.text][branch[k - 1].label.text] = 1;
						}

						if ( branch[k + 1] !== undefined ) {
							graph[station.label.text][branch[k + 1].label.text] = 1;
						}

						// info
						minX = ( minX > coord[0] ) ? coord[0] : minX;
						minY = ( minY > coord[1] ) ? coord[1] : minY;
						maxX = ( maxX < coord[0] ) ? coord[0] : maxX;
						maxY = ( maxY < coord[1] ) ? coord[1] : maxY;

						//stations
						if ( !this._stationsMap[coord[0]] ) {
							this._stationsMap[coord[0]] = [];
						}

						if ( !this._stationsMap[coord[0]][coord[1]] ) {
							station.style = stationStyle;
							station.radius = stationRadius;
							station.font = stationFont;
							this._stationsMap[coord[0]][coord[1]] = station;
							this._stations.push( station );
						} else if ( !this._stationsMap[coord[0]][coord[1]].exchange ) {
							station = this._stationsMap[coord[0]][coord[1]];
							station.style = exchangeStyle;
							station.radius = exchangeRadius;
							station.font = exchangeFont;
							station.exchange = true;
							this._transperList.push( station.label.text );
						}

						// lines
						xPos = convertCoord( coord[0] );
						yPos = convertCoord( coord[1] );

						if ( xPosPrev !== -1 && yPosPrev !== -1 ) {
							if ( xPosPrev === xPos || yPosPrev === yPos ) {
								linePath += "L" + xPos + "," + yPos;
							} else {
								// Catmull-Rom to Cubic Bezier conversion matrix 
								//    0       1       0       0
								//  -1/6      1      1/6      0
								//    0      1/6      1     -1/6
								//    0       0       1       0
								control1 = branch[ ( k < 2 ) ? ( ( k < 1 ) ? k : ( k - 1 ) ) : ( k - 2 ) ].coordinates;
								control2 = branch[ ( k > branch.length - 2 ) ? k  : ( k + 1 )].coordinates;
								controlPoint[0] = ( -convertCoord( control1[0] ) + 6 * xPosPrev + xPos ) / 6;
								controlPoint[1] = ( -convertCoord( control1[1] ) + 6 * yPosPrev + yPos ) / 6;
								controlPoint[2] = ( xPosPrev + 6 * xPos - convertCoord( control2[0] ) ) / 6;
								controlPoint[3] = ( yPosPrev + 6 * yPos - convertCoord( control2[1] ) ) / 6;

								linePath += "C" + controlPoint[0] + "," + controlPoint[1] +
									" " + controlPoint[2] + "," + controlPoint[3] +
									" " + xPos + "," + yPos;
							}
						} else {
							linePath += "M" + xPos + "," + yPos;
						}

						xPosPrev = xPos;
						yPosPrev = yPos;
					}

					this._lines.push( { path: linePath, style: lineStyle } );
					xPosPrev = yPosPrev = -1;
				}
			}
			this._leftTop = [ minX, minY ];
			this._rightBottom = [ maxX, maxY ];


			this._graph = graph;

			this.element.find( ".ui-routes-container" )
				.width( ( maxX + minX ) * this.options.interval + this.options.margin * 2 )
				.height( ( maxY + minY ) * this.options.interval + this.options.margin * 2 );
		},

		_drawGrid: function () {
			if ( !this.options.gridLine || !this._data ) {
				return;
			}

			var self = this,
				options = self.options,
				style = { stroke: 'blue', strokeWidth: 1 },
				interval = options.interval,
				margin = options.margin,
				cw = margin * 2 + interval * ( this._rightBottom[0] + 1 ),
				ch = margin * 2 + interval * ( this._rightBottom[1] + 1 ),
				i;

			for ( i = 0; i <= cw; i += interval ) {
				this._node( null, "line", {
					x1: 0.5 + i + margin,
					y1: 0.5 + i + margin,
					x2: margin,
					y2: 0.5 + i + margin
				}, style );
			}
			for ( i = 0; i <= ch; i += interval ) {
				this._node( null, "line", {
					x1: margin,
					y1: 0.5 + i + margin,
					x2: cw - margin,
					y2: 0.5 + i + margin
				}, style );
			}
		},

		_drawLines: function () {
			var i,
				lines = this._lines,
				length = lines.length;

			for ( i = 0; i < length; i += 1 ) {
				this._node( null, "path", {
					d: lines[i].path
				}, lines[i].style );
			}
		},

		_drawElements: function () {
			var i,
				options = this.options,
				interval = options.interval,
				margin = options.margin,
				stationRadius,
				stations = this._stations,
				station,
				label,
				coordinates,
				position,
				labelPosition = [0, 0],
				labelAngle = 0,
				group,
				stationName,
				text;

			for ( i = 0; i < stations.length; i += 1 ) {
				station = stations[i];
				label = station.label;
				coordinates = station.coordinates;
				position = [ margin + interval * coordinates[0], margin + interval * coordinates[1] ];
				stationRadius = station.radius;

				// draw station
				this._node( null, "circle", {
					cx: position[0],
					cy: position[1],
					r: stationRadius
				}, station.style );

				group = this._node( null, "g" );

				labelAngle = ( label.angle ) ? -parseInt( label.angle, 10 ) : 0;

				// draw station name
				if ( this._languageData ) {
					stationName = this._languageData[station.label.text] || station.label.text;
				} else {
					stationName = station.label.text;
				}

				text = this._text( group, stationName || "?", {},
					{ transform: "rotate(" + labelAngle + ")", fontSize: station.font.fontSize || "9" }
				);

				switch ( label.position || "s" ) {
				case "w" :
					labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] + stationRadius / 2 ];
					break;
				case "e" :
					labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] + stationRadius / 2 ];
					break;
				case "s" :
					labelPosition = [ position[0] - text.getBBox().width / 2, position[1] + stationRadius + text.getBBox().height ];
					break;
				case "n" :
					labelPosition = [ position[0] - text.getBBox().width / 2, position[1] - stationRadius - text.getBBox().height / 3 ];
					break;
				case "nw" :
					labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] - stationRadius / 2 - text.getBBox().height / 3  ];
					break;
				case "ne" :
					labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] - stationRadius / 2 - text.getBBox().height / 3 ];
					break;
				case "sw" :
					labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] + stationRadius + text.getBBox().height / 2  ];
					break;
				case "se" :
					labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] + stationRadius + text.getBBox().height / 2 ];
					break;
				}

				group.setAttribute( "transform", "translate(" + labelPosition[0] + "," + labelPosition[1] + ")" );
			}
		},

		_node: function ( parent, name, settings, style ) {
			var node, key, value,
				attributes = $.extend( settings, style || {} );

			parent = parent || this._svg;
			node = parent.ownerDocument.createElementNS( this._svgNS, name );

			for ( key in attributes ) {
				value = attributes[key];
				if ( value && ( typeof value !== 'string' || value !== '' ) ) {
					node.setAttribute( key.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase(), value);
				}
			}
			parent.appendChild( node );
			return node;
		},

		_text:  function ( parent, value, settings, style ) {
			var node = this._node( parent, "text", settings, style ),
				texts, i;

			if ( typeof value !== 'string' ) {
				value = "";
			}

			texts = value.split( "\n" );
			for ( i = 0; i < texts.length; i += 1 ) {
				this._node( node, "tspan", { x: "0",  y: ( settings.fontSize * i ) }, {} )
					.appendChild( node.ownerDocument.createTextNode( texts[i] ) );
			}

			return node;
		},

		// Dijkstra path-finding functions
		// Original code: https://bitbucket.org/wyatt/dijkstra.js(MIT license)
		// Thanks Wyatt Baldwin
		_calculateShortestPath: function ( graph, source, destination, isMinimumTransper ) {
			var predecessors, costs, open,
				closest,
				u, v,
				costU,
				adjacentNodes,
				costE,
				costUTotal,
				costV,
				first_visit,
				msg,
				nodes = [];

			// Predecessor map for each node that has been encountered.
			// node ID => predecessor node ID
			predecessors = {};

			// Costs of shortest paths from s to all nodes encountered.
			// node ID => cost
			costs = {};
			costs[source] = 0;

			// Costs of shortest paths from s to all nodes encountered; differs from
			// `costs` in that it provides easy access to the node that currently has
			// the known shortest path from s.
			// XXX: Do we actually need both `costs` and `open`?
			open = PriorityQueue.make();
			open.push( source, 0 );

			while ( !open.empty() ) {
				// In the nodes remaining in graph that have a known cost from s,
				// find the node, u, that currently has the shortest path from s.
				closest = open.pop();
				u = closest.value;
				costU = closest.cost;

				// Get nodes adjacent to u...
				adjacentNodes = graph[u] || {};

				// ...and explore the edges that connect u to those nodes, updating
				// the cost of the shortest paths to any or all of those nodes as
				// necessary. v is the node across the current edge from u.
				for ( v in adjacentNodes ) {
					// Get the cost of the edge running from u to v.
					costE = adjacentNodes[v];

					if ( this._transperList.indexOf( u ) !== -1 ) {
						costE += isMinimumTransper ? 99 : 1;
					}

					// Cost of s to u plus the cost of u to v across e--this is *a*
					// cost from s to v that may or may not be less than the current
					// known cost to v.
					costUTotal = costU + costE;

					// If we haven't visited v yet OR if the current known cost from s to
					// v is greater than the new cost we just found (cost of s to u plus
					// cost of u to v across e), update v's cost in the cost list and
					// update v's predecessor in the predecessor list (it's now u).
					costV = costs[v];
					first_visit = ( costs[v] === undefined );
					if ( first_visit || costV > costUTotal ) {
						costs[v] = costUTotal;
						open.push( v, costUTotal );
						predecessors[v] = u;
					}
				}
			}

			if ( destination !== undefined && costs[destination] === undefined ) {
				msg = ['Could not find a path from ', source, ' to ', destination, '.'].join( '' );
				throw new Error( msg );
			}

			while ( destination ) {
				nodes.push( destination );
				destination = predecessors[destination];
			}

			nodes.reverse();

			return nodes;
		},

		findPath: function ( source, destination, isMinimumTransper ) {
			var path = this._calculateShortestPath( this._graph, source, destination, isMinimumTransper );

			return path;
		},

		refresh: function ( redraw ) {
			var view, svgContainer;

			view = this.element;
			svgContainer = view.find( "ui-routes-svg" );

			if ( svgContainer.width() !== view.width() ) {
				svgContainer.width( view.width() );
			}

			if ( redraw ) {
				this._clear();
				this._drawGrid();
				this._drawLines();
				this._drawElements();
			}
		}
	});

	//auto self-init widgets
	$( document ).on( "pagecreate create", function ( e ) {
		$.mobile.routes.prototype.enhanceWithin( e.target );
	});

	$( window ).on( "pagechange", function () {
		$( ".ui-page-active .ui-routes" ).routes( "refresh", true  );
	}).on( "resize", function () {
		$( ".ui-page-active .ui-routes" ).routes( "refresh" );
	});

} ( jQuery, this ) );