/*!
 * jQuery mobile routes plugin v0.1.0 - Copyright (c) 2013 Wonseop Kim
 * Released under MIT license
 */

( function ( $, window ) {
	var document = window.document;

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
		_stationList: {},
		_graph: {},

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
				duplicatedStation,
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
				shorthand,
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

						if ( graph[station.code] === undefined ) {
							graph[station.code] = {};
						}

						if ( branch[k - 1] !== undefined ) {
							graph[station.code][branch[k - 1].code] = 3;
						}

						if ( branch[k + 1] !== undefined ) {
							graph[station.code][branch[k + 1].code] = 3;
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

						this._stationList[ station.code ] = station.label.text;

						if ( !this._stationsMap[coord[0]][coord[1]] ) {
							station.style = stationStyle;
							station.radius = stationRadius;
							station.font = stationFont;
							this._stationsMap[coord[0]][coord[1]] = station;
							this._stations.push( station );
						} else if ( !this._stationsMap[coord[0]][coord[1]].exchange ) {
							duplicatedStation = this._stationsMap[coord[0]][coord[1]];
							duplicatedStation.style = exchangeStyle;
							duplicatedStation.radius = exchangeRadius;
							duplicatedStation.font = exchangeFont;
							duplicatedStation.exchange = true;

							graph[station.code][duplicatedStation.code] = "TRANSPER";
							graph[duplicatedStation.code][station.code] = "TRANSPER";
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
								shorthand = branch[ ( k > branch.length - 2 ) ? k  : ( k + 1 )].coordinates;
								controlPoint[0] = ( xPosPrev + 6 * xPos - convertCoord( shorthand[0] ) ) / 6;
								controlPoint[1] = ( yPosPrev + 6 * yPos - convertCoord( shorthand[1] ) ) / 6;

								linePath += "S" + " " + controlPoint[0] + "," + controlPoint[1] +
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
					class: "station-" + station.label.text,
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
				nodes = [],
				PriorityQueue = function () {
					var queue = [],
						sorter = function ( a, b ) {
							return a.cost - b.cost;
						};

					this.push = function ( value, cost ) {
						var item = { value: value, cost: cost };

						queue.push( item );
						queue.sort( sorter );
					};

					this.pop = function () {
						return queue.shift();
					};

					this.empty = function () {
						return queue.length === 0;
					};
				};

			predecessors = {};

			costs = {};
			costs[source] = 0;

			open = new PriorityQueue();
			open.push( source, 0 );

			while ( !open.empty() ) {
				closest = open.pop();
				u = closest.value;
				costU = closest.cost;

				adjacentNodes = graph[u] || {};

				for ( v in adjacentNodes ) {
					costE = adjacentNodes[v];

					if ( costE === "TRANSPER" ) {
						costE = isMinimumTransper ? 999 : 5;
					}

					costUTotal = costU + costE;

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

		getCodeByName: function ( name ) {
			var stationList = this._stationList, key;

			for ( key in stationList ) {
				if( stationList[key] === name) {
					return key;
				}
			}
		},

		getNameByCode: function ( code ) {
			return this._stationList[code];
		},

		findPath: function ( source, destination, isMinimumTransper, noDisplay ) {
			var i, j,
				svgDoc = this._svg,
				stations = this._stations,
				stationList = this._stationList,
				path = this._calculateShortestPath( this._graph, source, destination, isMinimumTransper );

			if ( noDisplay || !svgDoc ) {
				return path;
			}

			for ( i = 0; i < path.length; i++ ) {
				for ( j = 0; j < stations.length; j += 1 ) {
					if ( stations[j].label.text === stationList[path[i]] ) {
						$( ".station-" + stationList[path[i]] )[0].classList.add( "selected" );
						break;
					}
				}
			}

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