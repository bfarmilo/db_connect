import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Icon } from './jsx/icons';
import { PatentImage } from './jsx/PatentImageView';
/** @jsx h */

const CONTROL_HEIGHT = 25;

class PatentImages extends Component {

    constructor(props) {
        super(props);
        this.state = {
            patentImages: new Map(),
            currentImage: 0,
            firstImage: 0,
            prevEnabled: false,
            lastImage: 0,
            nextEnabled: true,
            rotation: 0,
            windowSize: { width: 0, height: 0 }
        };
    }
    // should display an image
    // jump forward and back one image
    // interface to set preferred orientation (Rotation) in the DB
    // image displayed should lock to patentDetail window being shown

    componentDidMount() {
        ipcRenderer.on('state', (event, data) => {
            console.log('received data', data);
            // Data format: ImageID, PatentID, PageNumber, ImageURL, PageData, Rotation
            const { firstImage, lastImage } = data && data.reduce((extremes, current) => {
                let { firstImage, lastImage } = extremes;
                extremes.firstImage = current.PageNumber < firstImage ? current.PageNumber : firstImage;
                extremes.lastImage = current.PageNumber > lastImage ? current.PageNumber : lastImage;
                return extremes;
            }, { firstImage: 999, lastImage: 0 });
            console.log(firstImage, lastImage);
            const images = data.map(image => [image.PageNumber, { imageID: image.ImageID, url: image.ImageURL, pageData: image.PageData, rotation: image.Rotation }]);
            const patentImages = images && new Map(images);
            this.setState({
                patentImages,
                firstImage,
                lastImage,
                currentImage: firstImage,
                rotation: patentImages.get(firstImage).rotation
            });
        });
        ipcRenderer.on('resize', (event, { width, height }) => {
            console.log(`got new window size width:${width} height:${height}`);
            this.setState({ windowSize: { width, height } });
        });
    }

    changeRotation = e => {
        const cycle = {
            0: 270,
            90: 0,
            180: 90,
            270: 180
        };
        const currentRecord = this.state.patentImages.get(this.state.currentImage);
        const rotation = cycle[this.state.rotation];
        console.log(`rotating image ID ${currentRecord.imageID} from ${this.state.rotation} to ${rotation}`);
        ipcRenderer.send('rotate_image', rotation, currentRecord.imageID);
        ipcRenderer.send('change_window_rotation');
        // in the meantime
        const patentImages = new Map([...this.state.patentImages]);
        patentImages.set(this.state.currentImage, { ...currentRecord, rotation })
        this.setState({ rotation, patentImages });
    }

    nextPage = e => {
        console.log('got request to go to next image page');
        const currentImage = this.state.currentImage !== this.state.lastImage ? this.state.currentImage + 1 : this.state.currentImage;
        const rotation = this.state.patentImages.get(currentImage).rotation;
        if ((this.state.rotation / 90) % 2 !== (rotation / 90) % 2) ipcRenderer.send('change_window_rotation');
        const nextEnabled = currentImage !== this.state.lastImage;
        const prevEnabled = true;
        this.setState({ currentImage, rotation, prevEnabled, nextEnabled });
    }

    prevPage = e => {
        console.log('got request to go to prev image page');
        const currentImage = this.state.currentImage !== this.state.firstImage ? this.state.currentImage - 1 : this.state.currentImage;
        const rotation = this.state.patentImages.get(currentImage).rotation;
        if ((this.state.rotation / 90) % 2 !== (rotation / 90) % 2) ipcRenderer.send('change_window_rotation');
        const prevEnabled = currentImage !== this.state.firstImage;
        const nextEnabled = true;
        this.setState({ currentImage, rotation, prevEnabled, nextEnabled });
    }

    reportViewport = (width, height) => {
        console.log(`viewport wants new width:${width} and height:${height}`);
        console.log(`requesting new size ${width} x ${height + CONTROL_HEIGHT + 5}`);
        ipcRenderer.send('request_resize', width, height + CONTROL_HEIGHT + 5);
    }

    render({ }, { }) {
        return (
            <div>
                <div style={{ height: `${CONTROL_HEIGHT}px`, position: 'fixed' }}>
                    <button onClick={this.changeRotation}>Rotate</button>
                    <button disabled={!this.state.nextEnabled} onClick={this.nextPage}>Next</button>
                    <button disabled={!this.state.prevEnabled} onClick={this.prevPage}>Prev</button>
                </div>
                <div style={{ paddingTop: `${CONTROL_HEIGHT}px`, margin: '0px' }}>
                    {this.state.currentImage ? < PatentImage
                        imageData={this.state.patentImages}
                        showPage={this.state.currentImage}
                        windowSize={this.state.windowSize}
                        controlAreaHeight={CONTROL_HEIGHT}
                        rotation={this.state.rotation}
                        reportViewport={this.reportViewport}
                    /> : <div />}
                </div>
            </div>
        );
    }
}



render(<PatentImages />, document.getElementById('patentImage'))