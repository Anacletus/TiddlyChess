
import { IChangedTiddlers, IParseTreeNode, IWidgetInitialiseOptions } from 'tiddlywiki';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import LichessPgnViewer from 'lichess-pgn-viewer';
import './files/lichess-pgn-viewer.css';

enum Modes {
	Min = 'min',
	Mincon = 'mincon'
}
class MyWidget extends Widget {

	private pgn?: string;
	private orientation?: 'white' | 'black' | undefined;
	private orientationS?: string;
	private showMoves?: false | "right" | "bottom" | "auto";
	private showMovesS?: string;
	private initialPly?: number | 'last';
	private width?: number;
	private showControlsS?: string;
	private showControls?: boolean;
	private modeS?: string;
	private initialPlyS?: string;


	// Do not define constructor

	/** The initialization work is placed here and can be left undefined */
	initialise(parentNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
		// The initialization method of the base class needs to be called
		super.initialise(parentNode, options);
		// If there are no attributes for the widget, this below is not needed, but it is generally needed
		this.computeAttributes();
	}

	/** Optional, usually to do some parsing and so on before formal rendering */
	execute() {
		// This is required to support children widgets
		this.makeChildWidgets();
		// Do some other parsing work, here's an example
		this.pgn = this.getAttribute("pgn", "");

		this.orientationS = this.getAttribute("orientation", "");
		this.orientation = this.orientationS == "white" ? 'white' : this.orientationS == "black" ? 'black' : undefined

		this.initialPlyS = this.getAttribute("initialPly", "");
		this.initialPly = this.initialPlyS == 'last' ? 'last' : parseInt(this.initialPlyS);

		this.width = parseInt(this.getAttribute("width", "40"));

		this.showMovesS = this.getAttribute("showMoves", "");
		this.showMoves = this.showMovesS == "false" ? false : this.showMovesS == "right" ? 'right' : this.showMovesS == "bottom" ? 'bottom' : this.showMovesS == "auto" ? 'auto' : undefined;

		this.showControlsS = this.getAttribute("showControls", "");
		this.showControls = this.showControlsS == "true" ? true : this.showControlsS == "false" ? false : undefined;

		this.modeS = this.getAttribute("mode", "");
		if (this.modeS == Modes.Min) {
			this.showMoves = false;
			this.showControls = false;
			this.width = 15;
		}
		else if (this.modeS == Modes.Mincon) {
			this.showMoves = false;
			this.showControls = true;
			this.width = 15;
		}
	}

	/** It will only be called automatically when rendering for the first time, when re-rendering after destruction, or actively through methods such as this.refreshSelf */
	render(parentNode: Element, nextSibling: Element) {
		// Rendering pre-processing work
		//this.parentDomNode = parent;
		this.execute();
		let div = this.document.createElement("div");

		let config = {
			pgn: this.pgn, // the PGN to render
			//fen: undefined, // initial FEN, will append [FEN "initial FEN"] to the PGN
			//showPlayers: undefined, // show the players above and under the board
			//showClocks: true, // show the clocks alongside the players
			showMoves: this.showMoves, // false | "right" | "bottom" | auto. "auto" uses media queries
			showControls: this.showControls, // show the [prev, menu, next] buttons
			//scrollToMove: true, // enable scrolling through moves with a mouse wheel
			//keyboardToMove: true, // enable keyboard navigation through moves
			orientation: this.orientation, // orientation of the board. Undefined to use the Orientation PGN tag.
			initialPly: this.initialPly, // current position to display. Can be a number, or "last"
			//chessground: {}, // chessground configuration https://github.com/lichess-org/chessground/blob/master/src/config.ts#L7
			//drawArrows: true, // allow mouse users to draw volatile arrows on the board. Disable for little perf boost
			//menu: {
			//	getPgn: {
			//		enabled: true, // enable the "Get PGN" menu entry
			//		fileName: undefined, // name of the file when user clicks "Download PGN". Leave empty for automatic name.
			//	},
			//	practiceWithComputer: {
			//		enabled: true,
			//	},
			//	analysisBoard: {
			//		enabled: true,
			//	},
			//},
			//lichess: 'https://lichess.org', // support for Lichess games, with links to the game and players. Set to false to disable.
			//classes: undefined, // CSS classes to set on the root element. Defaults to the element classes before being replaced by LPV.
		};

		const lpv = LichessPgnViewer(div as HTMLElement, config);
		// lpv is an instance of PgnViewer , providing some utilities such as:
		//lpv.goTo('first');
		//lpv.goTo('next');
		//lpv.flip();

		if (lpv.div != undefined) {
			lpv.div.setAttribute('style', `--board-color:#F0D9B5;width: ${this.width}em`);

			//workaround to display correctly arrows in the position. We do it before inserting in order to not take focus.
			// Does not work with pgn with no moves...
			if (lpv.canGoTo('prev')) {
				lpv.goTo('prev');
				lpv.goTo('next');
			}
			else if
				(lpv.canGoTo('next')) {
				lpv.goTo('next');
				lpv.goTo('prev');
			}

			//original div seems unchanged, so we insert the node contained in lpv
			parentNode.insertBefore(lpv.div as Node, nextSibling);
			// Please put all created domNodes (root nodes are fine) into domNodes, so that tw can do automatic recycling.
			this.domNodes.push(lpv.div as Element);

			// The following content can be added when child widgets are supported. will update this.children
			this.renderChildren(lpv.div as Element, nextSibling);
		}
	}

	/**
	 * Optional, refresh is performed, if not defined, no refresh is done, but an attempt is made to refresh the children widgets
	 * The returned value represents whether or not it is refreshed, and is used as a reference for the upper-level widget
	 */
	refresh(changedTiddlers: IChangedTiddlers): boolean {
		// Update the parameters and find out which ones have changed
		let name = this.getAttribute('tiddler', "");
		const changedAttributes = this.computeAttributes();
		// Determine whether to perform a refresh or not, the determination here is just an example
		if (changedAttributes.pgn || changedAttributes.orientation ||
			changedAttributes.width || changedAttributes.mode ||
			changedAttributes.showControls || changedAttributes.showMoves ||
			changedAttributes.initialPly ||
			//this redraws all boards in a tiddler when editing it with preview.. ¿Is it needed?
			changedTiddlers[name]
			//changedTiddlers.includes(changedAttributes.title)

		) {
			// The refreshSelf of the base class function is simply a brutal removal of dom&chidren + re-rendering
			// For fine-grained refreshing, please implement your own
			this.refreshSelf();
			this.refreshChildren(changedTiddlers);
			return true;
		} else {
			// If you don't need to refresh yourself, try to have the children widgets refresh
			return this.refreshChildren(changedTiddlers);
		}
	}
}

exports['pgn'] = MyWidget;


