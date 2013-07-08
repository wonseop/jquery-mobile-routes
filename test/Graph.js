function Edge () {
	this.id = 0;
	this.time = 0;
	this.tansfer = 0;
	this.next = null;
}

function Graph () {
	this.station = [];
	this.graph = [];
	this.route = [];
	this.n = 0;
}

Graph.prototype.choose = function ( isMinTime ) {
	var min = 99999, min_transfer = 9999, pos = -1, i;

	if ( isMinTime ) {
		for ( i = 0; i < this.n; i++ ) {
			if ( this.route[i] < 0 ) {
				if ( this.graph[i].time < min) {
					min = this.graph[i].time;
					min_transfer = this.graph[i].transfer;
					pos = i;
				} else if ( this.graph[i].time === min &&
					this.graph[i].transfer < min_transfer) {
					min = this.graph[i].time;
					min_transfer = this.graph[i].transfer;
					pos = i;
				}
			}
		}
	} else {
		for ( i = 0; i < this.n; i++ )
		{
			if ( this.route[i] < 0)
			{
				if ( this.graph[i].transfer < min_transfer) {
					min = this.graph[i].time;
					min_transfer = this.graph[i].transfer;
					pos = i;
				} else if ( this.graph[i].transfer === min_transfer &&
					this.graph[i].time < min ) {
					min = this.graph[i].time;
					min_transfer = this.graph[i].transfer;
					pos = i;
				}
			}
		}
	}

	return pos;
};

Graph.prototype.dijkstraAlgorithm = function ( start, isMinTime ) {
	var minpos, i, p; 

	for ( i = 0; i < this.n; i++ ) {
		this.route[i] = -1;
		this.graph[i].id = -1;
		this.graph[i].time = 99999;
		this.graph[i].transfer = 9999;
	}

	for ( p = this.graph[start].next; p !== null; p = p.next ) {
		if ( this.station[start] === this.station[p.id]) {
			this.graph[p.id].time = 0;
			this.graph[p.id].transfer = 0;
		} else {
			this.graph[p.id].time = p.time;
			this.graph[p.id].transfer = p.transfer;
		}
	}

	for ( i = 0; i < this.n; i++ ) {
		if ( this.station[start] === this.station[i] ) {
			for ( p = this.graph[i].next; p !== null; p = p.next ) {
				if (this.station[i] == this.station[p.id]) {
					p.time = 0;
					p.transfer = 0;
				}
			}
		}
	}

	this.route[start] = 0;
	this.graph[start].time = 0;
	this.graph[start].transfer = 0;

	for ( i = 0; i < this.n - 2; i++ ) {
		minpos = this.choose( isMinTime );
		this.route[minpos] = 0;

		for ( p = this.graph[minpos].next; p !== null; p = p.next ) {
			if ( isMinTime ) {
				if ( this.graph[minpos].time + p.time < this.graph[p.id].time ) {
					this.graph[p.id].time = this.graph[minpos].time + p.time;
					this.graph[p.id].transfer = this.graph[minpos].transfer + p.transfer;
				} else if ( this.graph[minpos].time + p.time === this.graph[p.id].time ) {
					if ( this.graph[minpos].transfer + p.transfer < this.graph[p.id].transfer ) {
						this.graph[p.id].time = this.graph[minpos].time + p.time;
						this.graph[p.id].transfer = this.graph[minpos].transfer + p.transfer;
					}
				}
			} else {
				if ( this.graph[minpos].transfer + p.transfer < this.graph[p.id].transfer) {
					this.graph[p.id].time = this.graph[minpos].time + p.time;
					this.graph[p.id].transfer = this.graph[minpos].transfer + p.transfer;
				} else if ( this.graph[minpos].transfer + p.transfer === this.graph[p.id].transfer ) {
					if ( this.graph[minpos].time + p.time < this.graph[p.id].time ) {
						this.graph[p.id].time = this.graph[minpos].time + p.time;
						this.graph[p.id].transfer = this.graph[minpos].transfer + p.transfer;
					}
				}
			}
		}
	}
};

Graph.prototype.subway = function ( array, max ) {
	var i,
		temp,
		s = [],
		start = -1, end = -1,
		t1, t2, time, s1, s2;

	for ( i = 0; i < max; i++ ) {
		this.graph[i] = new Edge();
		this.station[i] = "";
		this.route[i] = 0;
	}

	for ( i = 0; i < array.length; i++ ) {
		t1 = array[i][0];
		t2 = array[i][1];
		time = array[i][2];
		s1 = array[i][3];
		s2 = array[i][4];

		t1 -= 1;
		t2 -= 1;

		temp = new Edge();
		temp.id = t2;
		temp.time = time;
		temp.transfer = ( s1 === s2 ) ? 1 : 0;

		while ( this.graph[t1].next !== null ) {
			this.graph[t1] = this.graph[t1].next;
		}
		this.graph[t1].next = temp;

		temp = new Edge();
		temp.id = t1;
		temp.time = time;
		temp.transfer = ( s1 === s2 ) ? 1 : 0;

		while ( this.graph[t2].next !== null ) {
			this.graph[t2] = this.graph[t2].next;
		}
		this.graph[t2].next = temp;

		this.station[t1] = s1;
		this.station[t2] = s2;
	}

	for ( i=0; i < this.n; i++ ) {
		if ( this.station[i] == "소요산" ) {
			start = i;
			break;
		}
	}

	for ( i=0; i < this.n; i++ ) {
		if ( this.station[i] == "삼성" ) {
			end = i;
			break;
		}
	}

	this.dijkstraAlgorithm( start, true );

};

Graph.prototype.findRoute = function ( stack, start, end ) {
	var p;

	stack.push( start );

	if ( start === end ) {
		return true;
	}

	for ( p = this.graph[start].next; p !== null; p = p.next ) {
		if ( this.graph[start].time + p.time == this.graph[p.id].time &&
			this.graph[start].transfer + p.transfer == this.graph[p.id].transfer ) {
			if ( !this.FindRoute( stack, p.id, end ) ) {
				stack.pop();
			} else {
				return true;
			}
		}
	}
	return false;
};