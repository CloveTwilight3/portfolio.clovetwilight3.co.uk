// spotify-player.js - Improved player with fallback functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the Spotify display
  const spotifyPlayer = {
    container: document.getElementById('spotify-player'),
    backendUrl: 'http://104.219.239.218:3000',
    currentTrackId: null,
    isPlaying: false,
    
    init: function() {
      if (!this.container) {
        console.error('Spotify player container not found');
        return;
      }
      
      // Create the player UI first
      this.createPlayerUI();
      
      // Then attempt to connect to backend, with fallback display
      this.startPolling();
    },
    
    createPlayerUI: function() {
      // Trans flag colors
      const colors = {
        blue: '#5BCEFA',
        pink: '#F5A9B8',
        white: '#FFFFFF'
      };
      
      this.container.innerHTML = `
        <div class="spotify-player-container">
          <div class="spotify-player-content">
            <div class="spotify-player-header">
              <div class="spotify-player-logo">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>Now Playing</span>
              </div>
            </div>

            <div class="spotify-player-info">
              <div class="spotify-player-title">Checking Spotify...</div>
              <div class="spotify-player-artist">Please wait</div>
            </div>

            <div class="spotify-player-equalizer">
              ${Array(20).fill().map(() => 
                `<div class="spotify-player-bar" style="--random-height: ${Math.floor(Math.random() * 30)}%"></div>`
              ).join('')}
            </div>

            <div class="spotify-player-metadata">
              <div class="spotify-player-album">Fetching data...</div>
              <div class="spotify-player-explicit-container">
                <span class="spotify-player-explicit" style="visibility: hidden;">EXPLICIT</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Store references to elements we'll need to update
      this.elements = {
        title: this.container.querySelector('.spotify-player-title'),
        artist: this.container.querySelector('.spotify-player-artist'),
        album: this.container.querySelector('.spotify-player-album'),
        explicit: this.container.querySelector('.spotify-player-explicit'),
        bars: this.container.querySelectorAll('.spotify-player-bar')
      };
      
      // Add custom CSS
      this.addCustomCSS();
    },
    
    addCustomCSS: function() {
      // Check if styles already exist
      if (document.getElementById('spotify-player-styles')) {
        return;
      }
      
      const style = document.createElement('style');
      style.id = 'spotify-player-styles';
      style.textContent = `
        /* Trans-themed Spotify Player Styles */
        .spotify-player-container {
          position: relative;
          max-width: 350px;
          border-radius: 10px;
          overflow: hidden;
          margin: 20px auto;
          padding: 0;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          /* Trans flag gradient background */
          background: linear-gradient(to bottom,
            #5BCEFA 0%, #5BCEFA 20%,
            #F5A9B8 20%, #F5A9B8 40%,
            #FFFFFF 40%, #FFFFFF 60%,
            #F5A9B8 60%, #F5A9B8 80%,
            #5BCEFA 80%, #5BCEFA 100%
          );
        }

        .spotify-player-content {
          position: relative;
          background-color: rgba(0, 0, 0, 0.75);
          color: white;
          padding: 15px;
          z-index: 2;
        }

        .spotify-player-header {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        .spotify-player-logo {
          display: flex;
          align-items: center;
          color: #5BCEFA; /* Trans flag light blue */
          font-size: 14px;
          font-weight: 500;
        }

        .spotify-player-logo svg {
          height: 20px;
          width: 20px;
          margin-right: 8px;
          fill: #5BCEFA; /* Trans flag light blue */
        }

        .spotify-player-info {
          text-align: center;
          margin: 10px 0 15px;
        }

        .spotify-player-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
          word-break: break-word;
        }

        .spotify-player-artist {
          font-size: 18px;
          color: #ccc;
          word-break: break-word;
        }

        .spotify-player-equalizer {
          height: 40px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 2px;
          margin: 15px 0;
        }

        .spotify-player-bar {
          width: 3px;
          border-radius: 1px;
          transition: height 0.2s ease;
          height: 5px;
        }

        /* Animated equalizer with trans flag colors */
        .spotify-player-bar:nth-child(3n) {
          background-color: #5BCEFA; /* Trans blue */
        }

        .spotify-player-bar:nth-child(3n+1) {
          background-color: #F5A9B8; /* Trans pink */
        }

        .spotify-player-bar:nth-child(3n+2) {
          background-color: #FFFFFF; /* White */
        }

        @keyframes equalize {
          0%, 100% {
            height: calc(5px + var(--random-height, 10%));
          }
          50% {
            height: calc(30px + var(--random-height, 10%));
          }
        }

        .spotify-player-bar {
          animation: equalize 1.5s ease-in-out infinite;
          animation-delay: calc(var(--index, 0) * 0.1s);
        }

        .spotify-player-metadata {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          color: #aaa;
        }

        .spotify-player-album {
          margin-top: 5px;
          font-style: italic;
        }

        .spotify-player-explicit {
          display: inline-block;
          padding: 3px 5px;
          background-color: #333;
          color: white;
          font-size: 10px;
          border-radius: 3px;
          margin-top: 10px;
        }
      `;
      document.head.appendChild(style);
    },
    
    startPolling: function() {
      // First give each bar a random animation delay and height
      this.elements.bars.forEach((bar, index) => {
        bar.style.setProperty('--index', index);
        bar.style.setProperty('--random-height', `${Math.floor(Math.random() * 25)}%`);
      });
      
      // Fetch current track immediately
      this.fetchCurrentlyPlaying();
      
      // Set up polling interval (check every 5 seconds)
      setInterval(() => {
        this.fetchCurrentlyPlaying();
      }, 5000);
    },
    
    fetchCurrentlyPlaying: async function() {
      try {
        // Add a timeout to the fetch to prevent long waits
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${this.backendUrl}/currently-playing`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // If 204 No Content (nothing playing) and fallback is enabled
        if (response.status === 204) {
          this.fetchRecentlyPlayed();
          return;
        }
        
        // If the response is not ok, show error state
        if (!response.ok) {
          this.showError(`Error: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        
        // If no track is currently playing
        if (!data || !data.item) {
          this.fetchRecentlyPlayed();
          return;
        }
        
        // Update the player with track info
        this.updatePlayerInfo(data.item, data.is_playing);
        
      } catch (error) {
        console.error('Error fetching current track:', error);
        this.showFallbackUI();
      }
    },
    
    fetchRecentlyPlayed: async function() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${this.backendUrl}/recently-played`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          this.showNotPlaying();
          return;
        }
        
        const data = await response.json();
        
        if (!data || !data.items || data.items.length === 0) {
          this.showNotPlaying();
          return;
        }
        
        // Get the most recent track
        const recentTrack = data.items[0].track;
        
        // Update the player with track info
        this.updatePlayerInfo(recentTrack, false, true);
        
      } catch (error) {
        console.error('Error fetching recently played tracks:', error);
        this.showFallbackUI();
      }
    },
    
    updatePlayerInfo: function(track, isPlaying, isRecent = false) {
      // Update track ID
      const trackId = track.id;
      const isNewTrack = trackId !== this.currentTrackId;
      this.currentTrackId = trackId;
      
      // Update track name with prefix for recently played
      this.elements.title.textContent = isRecent ? `Last played: ${track.name}` : track.name || 'Unknown Track';
      
      // Update artist(s)
      const artists = track.artists ? track.artists.map(artist => artist.name).join(', ') : 'Unknown Artist';
      this.elements.artist.textContent = artists;
      
      // Update album if available
      if (this.elements.album) {
        this.elements.album.textContent = track.album ? `Album: ${track.album.name}` : 'Album: Unknown';
      }
      
      // Update explicit label
      if (this.elements.explicit) {
        this.elements.explicit.style.visibility = track.explicit ? 'visible' : 'hidden';
      }
    },
    
    showNotPlaying: function() {
      this.elements.title.textContent = 'Nothing Playing';
      this.elements.artist.textContent = 'Open Spotify to play music';
      
      if (this.elements.album) {
        this.elements.album.textContent = 'Album: N/A';
      }
      
      if (this.elements.explicit) {
        this.elements.explicit.style.visibility = 'hidden';
      }
      
      this.currentTrackId = null;
    },
    
    showError: function(message) {
      this.elements.title.textContent = 'Connection Error';
      this.elements.artist.textContent = message;
      
      if (this.elements.album) {
        this.elements.album.textContent = 'Check backend status';
      }
      
      if (this.elements.explicit) {
        this.elements.explicit.style.visibility = 'hidden';
      }
    },
    
    showFallbackUI: function() {
      // Show fallback UI when backend is unreachable
      this.elements.title.textContent = 'Spotify Player Demo';
      this.elements.artist.textContent = 'Clove Twilight';
      
      if (this.elements.album) {
        this.elements.album.textContent = 'Album: Portfolio Demo';
      }
    }
  };
  
  // Initialize the Spotify player
  spotifyPlayer.init();
});
