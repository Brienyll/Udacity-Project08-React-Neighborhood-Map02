import React, { Component } from 'react';
import './App.css';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js'
import Map from './Map'
import Sidebar from './Sidebar'
import axios from 'axios'
import escapeRegExp from 'escape-string-regexp'

class App extends Component {

    state = {
        foursquareVenues: [],
        markerProperties: {
            color: "blue"
        },
        isActiveMarker: null,
        query: '',
        markers: [],
        showingMarkers: []
    }

    /** Important: I used this tutorial by Elharony to learn how to fetch data from Foursquare:
     * https://www.youtube.com/watch?v=dAhMIF0fNpo&list=PLgOB68PvvmWCGNn8UMTpcfQEiITzxEEA1&index=3
     * It is not as difficult as I imagined it beforehand, but the
     * getFoursquareVenues()-function is a slightly adjusted version of his tutorial!
     */

    getFoursquareVenues = () => {
        const apiEndpoint = "https://api.foursquare.com/v2/venues/explore?"
        const foursquareParameters = {
            client_id: "4QQDCSI1SQPEN4AUMQFAHJUWC3RK5F4WV2PVL1SCFKK1U0W1",
            client_secret: "SNX4V5ZR3IEWHWXEBPY3KDLTZWN4GIUUBPKO2SXV5KCLJASI",
            query: "arts",
            near: "Lyon, FR",
            v: 20182507
        }

        axios.get(apiEndpoint + new URLSearchParams(foursquareParameters))
            .then(response => {
                this.setState({
                    foursquareVenues: response.data.response.groups[0].items
                })
            })
            .catch(error => {
                alert("Error: Couldn't retrieve data from Foursquare.")
                console.log(`An error occurred: ${error}`)
            })
    }

    /**
     * I already tried beforehand to initialise the map with the help of a separate function.
     * I used this torial by Elharony to initialise my map:
     * https://www.youtube.com/watch?v=W5LhLZqj76s&list=PLgOB68PvvmWCGNn8UMTpcfQEiITzxEEA1&index=2
     * I would like to use "const map = new mapboxgl.Map();" instead of "this.map" to create the map
     * and "const marker = new mapboxgl.Marker({})" instead of "this.marker" to create a new marker.
     */

    initialiseMap = () => {
        mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuaWVsYS1rdWVzdGVyIiwiYSI6ImNqam9jdjF1YTAxczQzcG9na3JrZmh2bnkifQ.zMFUT-fI5tsviUOPZsJxog';
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v10',
            center: [4.841389, 45.758889],
            zoom: 12
        });
        // Store the map element in a variable that will pe passed to the Map component
        window.map = this.map;

        this.map.on('load', () => {
            this.addMarkers();

            // Add navigation controls to the map.
            this.map.addControl(new mapboxgl.NavigationControl());
        })
    }


    /**
     * I used Elharony's tutorial to fix a problem that I had in creating my
     * markers. Thanks to his tutorial, I found out that the asynchronous
     * data fetching from the Foursquare API was the culprit:
     * https://www.youtube.com/watch?v=_1RjbT5dIeM&list=PLgOB68PvvmWCGNn8UMTpcfQEiITzxEEA1&index=5
    */
    addMarkers = () => {
        const allMarkers = this.state.foursquareVenues
            .map(myVenue => {
                // Create popups with the data from the Foursquare API
                const popup = new mapboxgl.Popup({
                    offset: 40,
                    className: `${[myVenue.venue.location.lng, myVenue.venue.location.lat]}`
                })
                    .setLngLat([myVenue.venue.location.lng, myVenue.venue.location.lat])
                    .setHTML(
                        `<h1>${myVenue.venue.name}</h1>
                        <p>${myVenue.venue.location.formattedAddress}</p>`
                    )
                
                // Create markers with the data from the Foursquare API
                let marker = new mapboxgl.Marker({
                    color: this.state.markerProperties.color,
                    className: myVenue.venue.name
                })
                .setLngLat([myVenue.venue.location.lng, myVenue.venue.location.lat])
                .setPopup(popup)
                .addTo(this.map)

                /**
                 * This tutorial helped me to *finally* store the data that I wanted to
                 * store in my marker with the help of data-attributes:
                 * https://www.w3schools.com/jsref/prop_object_data.asp
                 * Also big thanks to Bram Vanroy who pointed out to me that data-attributes
                 * exist. They are just incredibly useful! Like magic applied to coding!
                 */

                marker.getElement().data = myVenue.venue.name;
                marker.getElement().classList.add("animated")
                marker.getElement().addEventListener('click', this.activateMarker)
                return marker;
            })
        /**
         * The following change of the state makes sure that at the beginning,
         * all of the markers are shown.
         */ 
        this.setState({ markers: allMarkers, showingMarkers: allMarkers });
    }

    activateMarker = (e) => {
        e.preventDefault();
        e.currentTarget.classList.toggle("flash")
    }
 
    handleClick(e) {
        e.preventDefault();
        let markersArray = this.props.showingMarkers
        for (let i = 0; i < markersArray.length; i++) {
            this.props.showingMarkers[i].getPopup()
            // Match the class names of the Popups with the class Name of the clicked button
            if (this.props.showingMarkers[i].getPopup().options.className === e.target.dataset.buttoncoord) {
                const activeMarker = this.props.showingMarkers[i]
                activeMarker.getElement().classList.toggle("flash")
                activeMarker.togglePopup()
            } else {
                this.props.showingMarkers[i].getPopup()._onClickClose();
            }
        }
        
    }

    componentDidMount() {
        this.getFoursquareVenues()
    }

    updateQuery = (query) => {
        this.setState({ query: query })
        this.updateMarkers(query);
    }

    /**
     * After I was stuck for days, Bartek Burkot helped me to
     * rewrite this function so that it updates the markers properly.
     */
    updateMarkers = (query) => {
        let showingMarkers = this.state.markers;
    
        if (query) {
            const match = new RegExp(escapeRegExp(query.toLowerCase(), 'i'))
            showingMarkers = this.state.markers.filter((myMarker) => {
                return match.test(
                    myMarker.getElement().data.toLowerCase()
                )
            }
            )
            this.setState({
                showingMarkers: showingMarkers
            })
        } else {
            this.setState({ showingMarkers: this.state.markers })
        }
    }

    render() {
        
        return (
            <div className="App">
                <main className="container">
                    <aside id="sidebar">
                        <Sidebar
                            foursquareVenues={this.state.foursquareVenues}
                            handleClick={this.handleClick}
                            markers={this.state.markers}
                            activateMarker={this.activateMarker}
                            query={this.state.query}
                            updateQuery={this.updateQuery}
                            showingMarkers={this.state.showingMarkers}
                        />
                    </aside>
                    <section>
                        <Map
                            venues={this.state.foursquareVenues}
                            initialiseMap={this.initialiseMap}
                            addMarkers={this.addMarkers}
                            query={this.state.query}
                            updateQuery={this.updateQuery}
                            updateMarkers={this.updateMarkers}
                            markers={this.state.markers}
                            showingMarkers={this.state.showingMarkers}
                            mapElement={this.map}
                            activateMarker={this.activateMarker}
                        />
                    </section>
                </main>
            </div>
        );
    }
}

export default App;