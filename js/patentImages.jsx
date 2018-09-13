import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Icon } from './jsx/icons';
import { PatentImage } from './jsx/PatentImageView';
/** @jsx h */

class PatentImages extends Component {

    constructor(props) {
        super(props);
        this.state = {
            result: {
                images: null
            },
            patentImages: new Map(),
            currentImage: 0,
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
            // console.log('summaries', JSON.stringify(data.summaries));
            const { images } = { ...data.images };
            console.log(new Map(images), images[0][0]);
            this.setState({
                patentImages: images && new Map(images),
                currentImage: images && images[0][0]
            });
        });
        ipcRenderer.on('resize', (event, { width, height }) => {
            console.log(`got new window size width:${width} height:${height}`);
            this.setState({ windowSize: { width, height } })
        })
    }

    render({ }, { }) {
        return (
            <div>
                {this.state.currentImage ? < PatentImage
                    imageData={this.state.patentImages}
                    showPage={this.state.currentImage}
                    rotation={90}
                    width={this.state.windowSize.width}
                /> : <div />}
            </div>
        );
    }
}



render(<PatentImages />, document.getElementById('patentImages'))