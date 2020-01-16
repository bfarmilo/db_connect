//TODO: clean this up. Stop the file from re-loading at the start when a PDF comes up. 
// Replace custom React PDF with standard PDF viewer window.

import { ipcRenderer } from 'electron';
import { h, Component } from 'preact';

import MyPdfViewer from './PDF_pdfmain';
import MyEditor from './PDF_editormain';
import '../css/PDF_App.css';


class Controls extends Component {
  //TODO make controls for clipping text,
  //optionally hiding background images
  //also stores state (Exhibit, pageNo, LineStart, LineEnd, CharStart, Charend)
  //
  render() {
    return (
      <nav class="Pdf-controls">
        <ul class="Pdf-control-buttons">
          <li>button1</li>
          <li>button2</li>
          <li>button3</li>
        </ul>
      </nav>
    )
  }
}


/* 
Note - Exhibit files have the schema
{ 
  "meta": {
        "matter": {
            "IPR": "IPR2016-01999",
            "Patent": 83342234,
            "Party": "partyname"
        },
        "file": "..\\FINAL - Patent Owner Preliminary Response.pdf",
        "doctype": "pre-POR",
        "regexMatch": "\\n(\\d{4}) ((.*)\\n)",
        "regexReplace": ",\\n\"Ex$1\": {\\n  \"title\":\"$2\",\\n  \"exhibit\":$1\\n  }\\n"
  },
  "Ex2001": {
        "title": "Declaration of Alfred Weaver, PH.D. Pursuant to 37 C.F.R. § 1.68",
        "exhibit": 2001,
        <"alias": "Weaver Declararion",>
        <"offset": 3,>
        "file": "Exhibit 2001.pdf", // or ["file1", "file2"]
  },
  ...
}
*/

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeExhibit: "meta",
      pages: 2,
      numPages: 2,
      exhibits: {},
      pageJump: 5,
      topHeight: 0,
      scrollPos: 0,
      totalHeight: 5000,
      status: "ready",
      exhibitpath: '',
      filetoLoad: 0,
      oldFiletoLoad: 0
    }
    this.handleNewFile = this.handleNewFile.bind(this);
    this.checkScroll = this.checkScroll.bind(this);
    this.updateWindowHeight = this.updateWindowHeight.bind(this);
    this.handleNewDir = this.handleNewDir.bind(this);
    this.getTotalPages = this.getTotalPages.bind(this);
  }

  componentDidMount() {
    window.addEventListener('scroll', (e) => this.checkScroll(e));
    //TODO: Obsolete?
    ipcRenderer.on('new_folder', (event, exlist) => {
      //console.log(`App: received data from Main process with exhibits`, exlist);
      this.handleNewDir(exlist);
    });
    //TODO: Obsolete
    ipcRenderer.on('exhibitpath', (event, expath) => {
      console.info(`App: got exhibit path ${expath}`)
      this.setState({ exhibitpath: expath });
    })
    //console.log(`App: sending ready message to main process`);
    ipcRenderer.send('window_ready');
  }

  //TODO don't need this anymore
  handleNewDir(exhibits) {
    this.setState({ exhibits });
    console.info(`App: received request for updating exhibits path ${this.state.exhibitpath} state`, exhibits);
  }

  //TODO update to handle a file
  handleNewFile(exhibitKey) {
    //totalHeight = resetHeight;
    document.body.scrollTop = 2;
    console.info(`App: new exhibit request received: ${exhibitKey}, status = ${this.state.status}`);
    //this.setState({ activeExhibit: exhibitKey, pages: 2 });
    console.info(`App: trying to spawn new viewer window for ${exhibitKey}`)
    this.setState({ topHeight: 0, status: 'newFile', filetoLoad: 0, oldFiletoLoad: 0 });
    ipcRenderer.send('select_viewer', exhibitKey);
  }

  getTotalPages(numPages) {
    console.log(`App: Total pages in file is ${numPages}`);
    this.setState({ numPages });
  }

  checkScroll(event) {
    const scrollPos = document.body.scrollTop;
    console.info(`scrolling ${scrollPos} / ${this.state.totalHeight}`);
    let pageToLoad = this.state.pages;
    let { totalHeight, filetoLoad, status } = this.state;
    if (status !== 'loading') {
      if (pageToLoad >= this.state.numPages) {
        if (Array.isArray(this.state.exhibits[this.state.activeExhibit].file) && this.state.oldFiletoLoad < this.state.exhibits[this.state.activeExhibit].file.length - 1) {
          filetoLoad = this.state.oldFiletoLoad + 1;
          totalHeight = document.getElementById('Viewer-area').offsetHeight - window.outerHeight;
          console.log(`next jump is for next part of multi-part exhibit ${filetoLoad + 1}/${this.state.exhibits[this.state.activeExhibit].file.length}`)
          pageToLoad = 0;
        }
      }
      if (scrollPos > this.state.totalHeight) {
        status = 'loading';
        console.info(`page jump requested:`, scrollPos, this.state.totalHeight)
        pageToLoad += this.state.pageJump;
      }
      if (scrollPos === 0) {
        // condition where scrollPos = 0, and previous page not loaded
      }
      this.setState({ scrollPos, pages: pageToLoad, status, filetoLoad, totalHeight, oldFiletoLoad: this.state.oldFiletoLoad !== filetoLoad ? filetoLoad : this.state.oldFiletoLoad })
    }
  }

  updateWindowHeight(newHeight) {
    let { status } = this.state;
    let totalHeight;
    if (status === 'newFile') {
      totalHeight = 5000;
      let jumpToPage = this.state.exhibits[this.state.activeExhibit].offset;
      console.info(`App: Jumping to page ${jumpToPage + 1}`);
      const topHeight = jumpToPage > 0 ? newHeight.slice(0, jumpToPage).reduce((a, b) => a + b) : 0;
      console.info(`App: height recieved for new file, scroll target ${topHeight}`);
      console.info(`jumping to new scroll target ${topHeight}`);
      document.body.scrollTop = topHeight;
      status = 'loading';
    }
    if (newHeight.length > 0)
      if (totalHeight !== newHeight.reduce((a, b) => a + b)) {
        totalHeight = newHeight.reduce((a, b) => a + b);
        status = 'ready';
        console.info(`App: window height update received, now ${totalHeight}`);
      }
    this.setState({ status, topHeight, totalHeight });
  }

  render() {
    let editTop = <div class="Edit-top">waiting for file</div>
    let editor = <div class="Editor"> </div>
    let viewer = <div class="pdf-viewer"> </div>
    if (this.state.exhibits.hasOwnProperty("meta")) {
      editTop = <div class="Edit-top">{this.state.exhibits.meta.matter.IPR} (patent {Number(this.state.exhibits.meta.matter.Patent).toLocaleString()})</div>;
      editor = <MyEditor
        onUserInput={this.handleNewFile}
        exhibitfile={this.state.exhibits}
      />;
      viewer = <MyPdfViewer
        fileOffset={this.state.filetoLoad}
        pages={this.state.pages}
        rootpath={this.state.exhibitpath}
        exhibit={this.state.exhibits[this.state.activeExhibit]}
        startpage={this.state.exhibits[this.state.activeExhibit].offset ? this.state.exhibits[this.state.activeExhibit].offset : 0}
        getPages={this.getTotalPages}
        onNewHeight={this.updateWindowHeight}
      />;
    }
    return (
      <div class="App">
        <div class="Display-area">
          <div class="Edit-area">
            {editTop}
            {editor}
          </div>
          <div class="Pdf-area" id="Viewer-area">
            <Controls />
            {viewer}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
