document.addEventListener('DOMContentLoaded', function() {
    // Add debugging to console
    console.log("Document loaded, initializing portfolio scripts...");
    
    // Load projects from the generated markdown file
    fetchProjects();
    
    // Set up project filtering once projects are loaded
    setupProjectFilters();
});

// Global state for project visibility
const projectState = {
    showMode: 'all', // 'all', 'personal', or 'work'
    activeFilter: 'all' // Current active filter
};

async function fetchProjects() {
    try {
        console.log("Attempting to fetch projects.md...");
        // First try to fetch the projects.md file
        const response = await fetch('projects.md');
        
        if (!response.ok) {
            console.error("Failed to fetch projects.md with status:", response.status);
            console.log("Falling back to GitHub API fetch method...");
            // If projects.md doesn't exist yet, try to fetch directly from GitHub API
            await fetchProjectsFromGitHub();
            return;
        }
        
        console.log("Successfully fetched projects.md");
        const markdown = await response.text();
        console.log("Markdown content length:", markdown.length);
        
        // Log the first portion of markdown content for debugging
        console.log("Markdown content sample:", markdown.substring(0, 500));
        
        if (markdown.length > 0) {
            parseAndDisplayProjects(markdown);
        } else {
            console.error("Markdown file is empty");
            displayNoProjectsMessage();
        }
    } catch (error) {
        console.error('Error fetching projects:', error);
        console.log("Trying fallback to GitHub API...");
        try {
            await fetchProjectsFromGitHub();
        } catch (fallbackError) {
            console.error("GitHub API fallback also failed:", fallbackError);
            displayErrorMessage();
        }
    }
}

async function fetchProjectsFromGitHub() {
    // Your GitHub username and organization
    const username = 'clovetwilight3';
    const orgName = 'UnifiedGaming-Systems';
    
    try {
        console.log(`Fetching personal repositories for ${username} from GitHub API...`);
        // Fetch personal repositories from GitHub API
        const personalRepoResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&direction=desc`);
        
        if (!personalRepoResponse.ok) {
            console.error("GitHub API request for personal repos failed with status:", personalRepoResponse.status);
            throw new Error(`Failed to fetch personal repositories from GitHub: ${personalRepoResponse.statusText}`);
        }
        
        const personalRepos = await personalRepoResponse.json();
        console.log(`Successfully fetched ${personalRepos.length} personal repositories from GitHub API`);
        
        // Filter out forks
        const originalPersonalRepos = personalRepos.filter(repo => !repo.fork);
        console.log(`Found ${originalPersonalRepos.length} original personal repositories (non-forks)`);
        
        // Add a repoType property to each repository
        originalPersonalRepos.forEach(repo => {
            repo.repoType = 'personal';
        });
        
        // Now fetch organization repositories
        console.log(`Fetching organization repositories for ${orgName} from GitHub API...`);
        const orgRepoResponse = await fetch(`https://api.github.com/orgs/${orgName}/repos?sort=updated&direction=desc`);
        
        let originalOrgRepos = [];
        if (orgRepoResponse.ok) {
            const orgRepos = await orgRepoResponse.json();
            console.log(`Successfully fetched ${orgRepos.length} organization repositories from GitHub API`);
            
            // Filter out forks from org repos
            originalOrgRepos = orgRepos.filter(repo => !repo.fork);
            console.log(`Found ${originalOrgRepos.length} original organization repositories (non-forks)`);
            
            // Add a repoType property to each repository
            originalOrgRepos.forEach(repo => {
                repo.repoType = 'work';
                repo.orgName = orgName;
            });
        } else {
            console.warn(`Could not fetch organization repositories. Status: ${orgRepoResponse.status}`);
        }
        
        // Combine both sets of repositories
        const allRepos = [...originalPersonalRepos, ...originalOrgRepos];
        
        if (allRepos.length === 0) {
            console.warn("No repositories found in GitHub API.");
            displayNoProjectsMessage();
            return;
        }
        
        // Display projects
        displayProjects(allRepos);
    } catch (error) {
        console.error('Error fetching from GitHub API:', error);
        displayErrorMessage();
    }
}

function parseAndDisplayProjects(markdown) {
    console.log("Parsing markdown to display projects...");
    // Remove the loading indicator
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) {
        console.error("Could not find projects-container element");
        return;
    }
    
    projectsContainer.innerHTML = '';
    
    // Create a project grid
    const projectGrid = document.createElement('div');
    projectGrid.className = 'project-grid';
    projectsContainer.appendChild(projectGrid);
    
    try {
        // Simple check to see if we have project sections at all
        if (!markdown.includes("### Personal Projects") && !markdown.includes("### UnifiedGaming Systems Ltd Projects")) {
            console.warn("No project sections found in markdown");
            console.log("Markdown content:", markdown);
            displayNoProjectsMessage();
            return;
        }
        
        // Regular expressions to extract project information from markdown sections
        // First, check if there are sections for personal and organization projects
        const personalSectionRegex = /### Personal Projects\n\n([\s\S]*?)(?=### |$)/;
        const orgSectionRegex = /### UnifiedGaming Systems Ltd Projects\n\n([\s\S]*?)(?=### |$)/;
        
        // Extract personal and organization sections
        const personalSection = personalSectionRegex.exec(markdown);
        const orgSection = orgSectionRegex.exec(markdown);
        
        // Project regex to use within each section
        const projectRegex = /#### \[(.*?)\]\((.*?)\)(\s*\[ARCHIVE\])?\n\n([\s\S]*?)(?:\n\n\*\*Language:\*\* (.*?)\n\n)?⭐ (\d+) \| 🍴 (\d+)\n\n(?:Last updated: (.*?)\n\n)?---/g;
        
        let projectCount = 0;
        
        // Process personal projects first
        if (personalSection) {
            const personalContent = personalSection[1];
            
            console.log("Found personal projects section, content length:", personalContent.length);
            console.log("Sample:", personalContent.substring(0, 200));
            
            let match;
            
            // Reset regex index
            projectRegex.lastIndex = 0;
            
            while ((match = projectRegex.exec(personalContent)) !== null) {
                const [, name, url, archiveMarker, description, language, stars, forks, lastUpdated] = match;
                console.log(`Found personal project: ${name}, Language: ${language || "Not specified"}`);
                
                // Create project card
                const projectCard = createProjectCard({
                    name,
                    url,
                    description: description.trim(),
                    language,
                    stars,
                    forks,
                    lastUpdated,
                    repoType: 'personal',
                    // Check if this project is an archive based on the marker or name/description
                    isArchive: !!archiveMarker || isArchiveProject(name, description.trim())
                });
                
                projectGrid.appendChild(projectCard);
                projectCount++;
            }
        } else {
            console.warn("No personal projects section found in markdown");
        }
        
        // Process organization projects second
        if (orgSection) {
            const orgContent = orgSection[1];
            
            console.log("Found organization projects section, content length:", orgContent.length);
            console.log("Sample:", orgContent.substring(0, 200));
            
            let match;
            
            // Reset regex index
            projectRegex.lastIndex = 0;
            
            while ((match = projectRegex.exec(orgContent)) !== null) {
                const [, name, url, archiveMarker, description, language, stars, forks, lastUpdated] = match;
                console.log(`Found organization project: ${name}, Language: ${language || "Not specified"}`);
                
                // Create project card
                const projectCard = createProjectCard({
                    name,
                    url,
                    description: description.trim(),
                    language,
                    stars,
                    forks,
                    lastUpdated,
                    repoType: 'work', // Changed from 'organization' to 'work' for consistency
                    orgName: 'UnifiedGaming-Systems',
                    // Check if this project is an archive based on the marker or name/description
                    isArchive: !!archiveMarker || isArchiveProject(name, description.trim())
                });
                
                projectGrid.appendChild(projectCard);
                projectCount++;
            }
        } else {
            console.warn("No organization projects section found in markdown");
        }
        
        console.log(`Parsed and displayed ${projectCount} projects from markdown`);
        
        if (projectCount === 0) {
            console.warn("No projects found in the markdown file.");
            // Try to use direct GitHub API as a fallback
            fetchProjectsFromGitHub();
        } else {
            // Set up Work/Personal toggle and project filters
            setupWorkPersonalToggle();
            setupProjectFilters();
            
            // Create the project summary section
            createProjectSummary(projectGrid);
        }
    } catch (error) {
        console.error("Error parsing markdown:", error);
        console.log("Trying GitHub API as fallback after markdown parsing error");
        fetchProjectsFromGitHub();
    }
}

function displayProjects(repos) {
    console.log("Displaying projects from GitHub API data...");
    // Remove the loading indicator
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) {
        console.error("Could not find projects-container element");
        return;
    }
    
    projectsContainer.innerHTML = '';
    
    if (repos.length === 0) {
        console.warn("No repositories found in GitHub API data.");
        displayNoProjectsMessage();
        return;
    }
    
    // Create a project grid
    const projectGrid = document.createElement('div');
    projectGrid.className = 'project-grid';
    projectsContainer.appendChild(projectGrid);
    
    // Sort repositories - personal first, then organization
    repos.sort((a, b) => {
        if (a.repoType !== b.repoType) {
            return a.repoType === 'personal' ? -1 : 1;
        }
        return new Date(b.updated_at) - new Date(a.updated_at);
    });
    
    // Add project cards
    repos.forEach(repo => {
        console.log(`Creating card for: ${repo.name}, Language: ${repo.language || "Not specified"}, Type: ${repo.repoType}`);
        const projectCard = createProjectCard({
            name: repo.name,
            url: repo.html_url,
            description: repo.description || 'No description provided.',
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            lastUpdated: formatDateTime(repo.updated_at),
            repoType: repo.repoType,
            orgName: repo.orgName,
            // Check if this project is an archive based on name or description
            isArchive: isArchiveProject(repo.name, repo.description || '')
        });
        
        projectGrid.appendChild(projectCard);
    });
    
    console.log(`Displayed ${repos.length} projects from GitHub API`);
    
    // Set up Work/Personal toggle and project filters
    setupWorkPersonalToggle();
    setupProjectFilters();
    
    // Create the project summary section
    createProjectSummary(projectGrid);
}

// Create a summary of displayed projects
function createProjectSummary(projectGrid) {
    const personalProjects = projectGrid.querySelectorAll('.project-card.personal-project');
    const workProjects = projectGrid.querySelectorAll('.project-card.work-project');
    
    const summaryEl = document.createElement('div');
    summaryEl.className = 'project-summary';
    summaryEl.innerHTML = `
        <p>Showing <strong>${personalProjects.length + workProjects.length}</strong> projects 
        (<span class="personal-count">${personalProjects.length} personal</span>, 
        <span class="work-count">${workProjects.length} work</span>)</p>
    `;
    
    // Insert summary before the grid
    projectGrid.parentNode.insertBefore(summaryEl, projectGrid);
}

// Function to check if a project is an archive
function isArchiveProject(name, description) {
    // Check if the project name is "TransGamers" or contains archive-related keywords
    if (name === 'TransGamers') {
        return true;
    }
    
    // Check if the description contains archive-related keywords
    const archiveKeywords = ['public archive', 'archived', 'archive of'];
    return archiveKeywords.some(keyword => 
        description.toLowerCase().includes(keyword)
    );
}

// Format date and time in the viewer's local time zone
function formatDateTime(isoString) {
    try {
        const date = new Date(isoString);
        
        // Check for invalid date
        if (isNaN(date.getTime())) {
            console.warn(`Invalid date: ${isoString}`);
            return 'Unknown date';
        }
        
        // Format using the browser's locale and time zone settings
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZoneName: 'short'
        };
        
        // This will automatically format the date according to the viewer's locale and time zone
        let formattedDate = date.toLocaleString(navigator.language || 'en-US', options);
        
        // Add a note that this is displayed in the viewer's local time
        formattedDate += ' (your local time)';
        
        return formattedDate;
    } catch (error) {
        console.error("Error formatting date:", error);
        return 'Date error';
    }
}

function createProjectCard(project) {
    try {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        // Add data attributes for filtering
        if (project.repoType === 'work' || project.url.includes('UnifiedGaming-Systems')) {
            card.dataset.work = 'true';
            card.classList.add('work-project');
        } else {
            card.dataset.personal = 'true';
            card.classList.add('personal-project');
        }
        
        // Add data-type attribute for the type toggle
        card.dataset.type = project.repoType;
        
        // Add data attribute for the archive filter
        if (project.isArchive) {
            card.dataset.archive = 'true';
        }
        
        const content = document.createElement('div');
        content.className = 'project-content';
        
        // Project title with link
        const title = document.createElement('h3');
        title.className = 'project-title';
        
        // Create title container to hold the title and archive badge if needed
        const titleContainer = document.createElement('div');
        titleContainer.className = 'title-container';
        
        const titleLink = document.createElement('a');
        titleLink.href = project.url;
        titleLink.target = '_blank';
        titleLink.textContent = project.name;
        titleContainer.appendChild(titleLink);
        
        // Add archive badge if the project is an archive
        if (project.isArchive) {
            const archiveBadge = document.createElement('span');
            archiveBadge.className = 'archive-badge';
            archiveBadge.textContent = 'Archive';
            titleContainer.appendChild(archiveBadge);
        }
        
        // Add organization badge if it's a work project
        if (project.repoType === 'work' || project.url.includes('UnifiedGaming-Systems')) {
            const orgBadge = document.createElement('span');
            orgBadge.className = 'org-badge';
            orgBadge.textContent = 'UG Systems';
            titleContainer.appendChild(orgBadge);
        }
        
        title.appendChild(titleContainer);
        
        // Project description
        const description = document.createElement('p');
        description.className = 'project-description';
        description.textContent = project.description;
        
        // Technical stack badges
        const techStack = document.createElement('div');
        techStack.className = 'tech-stack';
        
        // Detect web development projects by name or description
        const isWebDev = project.name.toLowerCase().includes('web') || 
                         project.description.toLowerCase().includes('web') ||
                         project.description.toLowerCase().includes('website') ||
                         project.description.toLowerCase().includes('frontend') ||
                         project.description.toLowerCase().includes('front-end') ||
                         project.description.toLowerCase().includes('front end') ||
                         project.name.toLowerCase() === 'clovetwilight3.github.io' ||
                         project.name.toLowerCase() === 'plural-web' ||
                         project.name.toLowerCase() === 'spotify-player';
        
        // Add tech badges based on language and other cues in the project name/description
        if (project.language) {
            addTechBadge(techStack, project.language);
            card.dataset.language = project.language.toLowerCase();
            
            // Add related tech badges based on language
            if (project.language === 'JavaScript') {
                if (project.name.toLowerCase().includes('react') || 
                    project.description.toLowerCase().includes('react')) {
                    addTechBadge(techStack, 'React');
                    card.dataset.react = 'true';
                }
                if (project.name.toLowerCase().includes('node') || 
                    project.description.toLowerCase().includes('node')) {
                    addTechBadge(techStack, 'Node.js');
                    card.dataset.nodejs = 'true';
                }
                if (project.name.toLowerCase().includes('discord') || 
                    project.description.toLowerCase().includes('discord')) {
                    addTechBadge(techStack, 'Discord.js');
                    card.dataset.discord = 'true';
                }
                // Add Web Development badge for JavaScript projects
                if (isWebDev) {
                    addTechBadge(techStack, 'Web Development');
                    card.dataset.webdev = 'true';
                }
            } else if (project.language === 'TypeScript') {
                // TypeScript badge already added above, so we don't add it twice
                if (project.name.toLowerCase().includes('discord') || 
                    project.description.toLowerCase().includes('discord') ||
                    project.name.toLowerCase() === 'roommates-helper' ||
                    project.name.toLowerCase() === 'roommates-beta') {
                    addTechBadge(techStack, 'Discord.js');
                    card.dataset.discord = 'true';
                }
                // Add Web Development badge for TypeScript projects
                if (isWebDev) {
                    addTechBadge(techStack, 'Web Development');
                    card.dataset.webdev = 'true';
                }
            } else if (project.language === 'Java') {
                if (project.name.toLowerCase().includes('minecraft') || 
                    project.description.toLowerCase().includes('minecraft') ||
                    project.name.toLowerCase().includes('plugin') || 
                    project.description.toLowerCase().includes('plugin') ||
                    project.name.toLowerCase().includes('spigot') ||
                    project.name.toLowerCase().includes('bukkit')) {
                    addTechBadge(techStack, 'Spigot/Bukkit');
                    card.dataset.minecraft = 'true';
                }
            } else if (project.language === 'Python') {
                if (project.name.toLowerCase().includes('flask') || 
                    project.description.toLowerCase().includes('flask')) {
                    addTechBadge(techStack, 'Flask');
                    card.dataset.flask = 'true';
                }
                if (project.name.toLowerCase().includes('web') || 
                    project.description.toLowerCase().includes('web')) {
                    addTechBadge(techStack, 'Web');
                    card.dataset.web = 'true';
                    addTechBadge(techStack, 'Web Development');
                    card.dataset.webdev = 'true';
                }
            } else if (project.language === 'HTML' || project.language === 'CSS') {
                // For HTML/CSS projects, add web development badge
                addTechBadge(techStack, 'Web Development');
                card.dataset.webdev = 'true';
            }
        }
        
        // Add special badges for portfolio website
        if (project.name === 'clovetwilight3.github.io') {
            if (!project.language || project.language !== 'JavaScript') {
                addTechBadge(techStack, 'JavaScript');
                card.dataset.language = 'javascript';
            }
            addTechBadge(techStack, 'HTML5');
            card.dataset.html = 'true';
            addTechBadge(techStack, 'CSS3');
            card.dataset.css = 'true';
            addTechBadge(techStack, 'GitHub Pages');
            card.dataset.github = 'true';
            addTechBadge(techStack, 'Web Development');
            card.dataset.webdev = 'true';
        }
        
        // Add web development badge for specific web projects
        if (project.name === 'plural-web' || project.name === 'spotify-player') {
            addTechBadge(techStack, 'Web Development');
            card.dataset.webdev = 'true';
        }
        
        // Check for Discord-related projects
        if (project.name.toLowerCase().includes('discord') || 
            project.description.toLowerCase().includes('discord') ||
            project.name.toLowerCase() === 'roommates-helper' ||
            project.name.toLowerCase() === 'roommates-beta') {
            card.dataset.discord = 'true';
        }
        
        // Check for Minecraft-related projects
        if (project.name.toLowerCase().includes('minecraft') || 
            project.description.toLowerCase().includes('minecraft') ||
            project.name.toLowerCase().includes('plugin') || 
            project.description.toLowerCase().includes('plugin') ||
            project.name.toLowerCase().includes('spigot') ||
            project.name.toLowerCase().includes('bukkit')) {
            card.dataset.minecraft = 'true';
        }
        
        // Project meta information
        const meta = document.createElement('div');
        meta.className = 'project-meta';
        
        const stats = document.createElement('div');
        stats.className = 'project-stats';
        stats.innerHTML = `<span><i class="fas fa-star"></i> ${project.stars}</span> <span><i class="fas fa-code-branch"></i> ${project.forks}</span>`;
        
        const updated = document.createElement('div');
        updated.className = 'project-updated';
        updated.innerHTML = project.lastUpdated ? `<i class="fas fa-clock"></i> ${project.lastUpdated}` : '';
        
        // Add action buttons
        const actions = document.createElement('div');
        actions.className = 'project-actions';
        
        // Live demo button (for certain projects)
        let demoInfo = isWebProject(project);
        
        // Special case for the portfolio itself
        if (project.name === 'clovetwilight3.github.io') {
            demoInfo = {
                url: 'https://clovetwilight3.co.uk',
                label: 'View Live Site'
            };
        }
        
        if (demoInfo) {
            const demoButton = document.createElement('a');
            demoButton.href = demoInfo.url;
            demoButton.target = '_blank';
            demoButton.className = 'project-btn demo-btn';
            demoButton.innerHTML = `<i class="fas fa-external-link-alt"></i> ${demoInfo.label}`;
            actions.appendChild(demoButton);
        }
        
        // GitHub repo button
        const githubButton = document.createElement('a');
        githubButton.href = project.url;
        githubButton.target = '_blank';
        githubButton.className = 'project-btn github-btn';
        githubButton.innerHTML = '<i class="fab fa-github"></i> View Code';
        actions.appendChild(githubButton);
        
        // Add elements to card
        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(techStack);
        content.appendChild(meta);
        meta.appendChild(stats);
        meta.appendChild(updated);
        content.appendChild(actions);
        card.appendChild(content);
        
        return card;
    } catch (error) {
        console.error("Error creating project card:", error, project);
        // Return a simple error card
        const errorCard = document.createElement('div');
        errorCard.className = 'project-card error-card';
        errorCard.innerHTML = `<div class="project-content"><h3>Error displaying project</h3><p>Could not load: ${project.name || 'Unknown project'}</p></div>`;
        return errorCard;
    }
}

function addTechBadge(container, tech) {
    // Check if this badge already exists to avoid duplicates
    const existingBadges = Array.from(container.querySelectorAll('.tech-badge'))
        .map(badge => badge.textContent);
    
    if (existingBadges.includes(tech)) {
        return; // Skip if badge already exists
    }

    const badge = document.createElement('span');
    badge.className = 'tech-badge';
    badge.textContent = tech;
    
    // Add custom colors based on technology
    if (tech === 'JavaScript') {
        badge.classList.add('javascript');
    } else if (tech === 'React') {
        badge.classList.add('react');
    } else if (tech === 'TypeScript') {
        badge.classList.add('typescript');
    } else if (tech === 'Node.js') {
        badge.classList.add('nodejs');
    } else if (tech === 'Python') {
        badge.classList.add('python');
    } else if (tech === 'Java') {
        badge.classList.add('java');
    } else if (tech === 'Spigot/Bukkit') {
        badge.classList.add('minecraft');
    } else if (tech === 'Flask') {
        badge.classList.add('flask');
    } else if (tech === 'Web') {
        badge.classList.add('web');
    } else if (tech === 'Discord.js') {
        badge.classList.add('discord');
    } else if (tech === 'HTML5') {
        badge.classList.add('html');
    } else if (tech === 'CSS3') {
        badge.classList.add('css');
    } else if (tech === 'GitHub Pages') {
        badge.classList.add('github');
    } else if (tech === 'Markdown') {
        badge.classList.add('markdown');
    } else if (tech === 'Web Development') {
        badge.classList.add('webdev');
    }
    
    container.appendChild(badge);
}

function isWebProject(project) {
    // Check for plural-web and spotify-player repos
    if (project.name.toLowerCase() === 'plural-web') {
        return {
            url: 'https://friends.clovetwilight3.co.uk',
            label: 'Live Demo'
        };
    } else if (project.name.toLowerCase() === 'spotify-player') {
        return {
            url: 'http://demo.clovetwilight3.co.uk:8080/',
            label: 'Try Demo'
        };
    } else if (project.name.toLowerCase() === 'clovetwilight3.github.io') {
        return {
            url: 'https://clovetwilight3.co.uk',
            label: 'View Live Site'
        };
    }
    
    // For all other projects, return false
    return false;
}

function displayNoProjectsMessage() {
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) {
        console.error("Could not find projects-container element");
        return;
    }
    
    projectsContainer.innerHTML = `
        <div class="no-projects">
            <p>No original projects found. Any new non-forked repositories will appear here automatically.</p>
            <button onclick="window.retryLoadProjects()" class="retry-btn">
                <i class="fas fa-sync-alt"></i> Retry Loading Projects
            </button>
        </div>
    `;
}

function displayErrorMessage() {
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) {
        console.error("Could not find projects-container element");
        return;
    }
    
    projectsContainer.innerHTML = `
        <div class="error-message">
            <p>Unable to load projects. Please try again later.</p>
            <button onclick="window.retryLoadProjects()" class="retry-btn">
                <i class="fas fa-sync-alt"></i> Retry
            </button>
        </div>
    `;
}

// Set up the Work/Personal toggle
function setupWorkPersonalToggle() {
    const projectsSection = document.querySelector('.projects');
    if (!projectsSection) {
        console.warn("Projects section not found. Skipping Work/Personal toggle setup.");
        return;
    }
    
    // Check if toggle already exists
    if (document.querySelector('.project-type-toggle')) {
        return; // Toggle already set up
    }
    
    // Create the toggle container
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'project-type-toggle';
    
    // Create the toggle switch
    toggleContainer.innerHTML = `
        <div class="toggle-container">
            <div class="toggle-label">Show:</div>
            <div class="toggle-buttons">
                <button class="toggle-btn active" data-show="all">All Projects</button>
                <button class="toggle-btn" data-show="personal">Personal Only</button>
                <button class="toggle-btn" data-show="work">Work Only</button>
            </div>
        </div>
    `;
    
    // Insert the toggle before the filter buttons
    const filterSection = projectsSection.querySelector('.project-filters');
    
    if (filterSection) {
        filterSection.parentNode.insertBefore(toggleContainer, filterSection);
    } else {
        // If filter buttons not found, add it directly to the projects container
        const projectsContainer = projectsSection.querySelector('.container');
        if (projectsContainer) {
            // Insert after the subtitle
            const subtitle = projectsContainer.querySelector('.subtitle');
            if (subtitle) {
                subtitle.parentNode.insertBefore(toggleContainer, subtitle.nextSibling);
            } else {
                // Add at the beginning of the container
                projectsContainer.insertBefore(toggleContainer, projectsContainer.firstChild);
            }
        }
    }
    
    // Add event listeners to toggle buttons
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Get show value
            const showValue = this.getAttribute('data-show');
            
            // Update global state
            projectState.showMode = showValue;
            
            // Apply filtering
            applyProjectFilters();
        });
    });
}

// Project filtering functionality
function setupProjectFilters() {
    // Check for existing filter buttons
    let existingFilterButtons = document.querySelectorAll('.filter-btn');
    
    // If there are no filter buttons, create them
    if (existingFilterButtons.length === 0) {
        createFilterButtons();
        existingFilterButtons = document.querySelectorAll('.filter-btn');
    }
    
    // Skip if still no filter buttons (might mean container is missing)
    if (existingFilterButtons.length === 0) {
        console.log("No filter buttons found. Skipping filter setup.");
        return;
    }
    
    console.log(`Setting up ${existingFilterButtons.length} filter buttons`);
    
    // Remove the "Personal" and "Organization" filter buttons since we now have the toggle
    existingFilterButtons.forEach(button => {
        const filterValue = button.getAttribute('data-filter');
        if (filterValue === 'personal' || filterValue === 'organization') {
            button.remove();
        } else {
            // Add event listener to remaining buttons
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Get the filter value
                const filterValue = this.getAttribute('data-filter');
                console.log(`Filter selected: ${filterValue}`);
                
                // Update global state
                projectState.activeFilter = filterValue;
                
                // Apply filtering
                applyProjectFilters();
            });
        }
    });
}

// Create filter buttons if they don't exist
function createFilterButtons() {
    const projectsSection = document.querySelector('.projects');
    if (!projectsSection) {
        console.warn("Projects section not found. Cannot create filter buttons.");
        return;
    }
    
    // Check if filter buttons container already exists
    let filterButtonsContainer = projectsSection.querySelector('.project-filters');
    
    // Create the container if it doesn't exist
    if (!filterButtonsContainer) {
        filterButtonsContainer = document.createElement('div');
        filterButtonsContainer.className = 'project-filters';
        
        // Insert the container into the DOM
        const projectsContainer = projectsSection.querySelector('.container');
        if (projectsContainer) {
            // Find the toggle container
            const toggleContainer = projectsContainer.querySelector('.project-type-toggle');
            if (toggleContainer) {
                // Insert after the toggle
                toggleContainer.parentNode.insertBefore(filterButtonsContainer, toggleContainer.nextSibling);
            } else {
                // Insert after the subtitle
                const subtitle = projectsContainer.querySelector('.subtitle');
                if (subtitle) {
                    subtitle.parentNode.insertBefore(filterButtonsContainer, subtitle.nextSibling);
                } else {
                    // Add at the beginning of the container
                    projectsContainer.insertBefore(filterButtonsContainer, projectsContainer.firstChild);
                }
            }
        }
    }
    
    // Define the filter types (removed personal and organization)
    const filterTypes = [
        { value: 'all', label: 'All Projects' },
        { value: 'javascript', label: 'JavaScript' },
        { value: 'typescript', label: 'TypeScript' },
        { value: 'java', label: 'Java' },
        { value: 'python', label: 'Python' },
        { value: 'minecraft', label: 'Minecraft' },
        { value: 'discord', label: 'Discord' },
        { value: 'archive', label: 'Archives' }
    ];
    
    // Create buttons for each filter type
    filterTypes.forEach(filter => {
        const button = document.createElement('button');
        button.className = 'filter-btn' + (filter.value === 'all' ? ' active' : '');
        button.setAttribute('data-filter', filter.value);
        button.textContent = filter.label;
        filterButtonsContainer.appendChild(button);
    });
}

// Combined filtering logic for both type toggle and category filters
function applyProjectFilters() {
    console.log(`Applying filters - Mode: ${projectState.showMode}, Filter: ${projectState.activeFilter}`);
    const projectGrid = document.querySelector('.project-grid');
    if (!projectGrid) {
        console.warn("Project grid not found. Cannot filter projects.");
        return;
    }
    
    // Add filtering class to trigger animation
    projectGrid.classList.add('filtering');
    
    // Get all project cards
    const projectCards = document.querySelectorAll('.project-card');
    console.log(`Found ${projectCards.length} project cards to filter`);
    
    setTimeout(() => {
        let visibleCount = 0;
        let personalCount = 0;
        let workCount = 0;
        
        // Apply filtering logic
        projectCards.forEach(card => {
            // First apply the work/personal filter
            let shouldShowByType = true;
            
            if (projectState.showMode === 'personal') {
                shouldShowByType = card.classList.contains('personal-project');
            } else if (projectState.showMode === 'work') {
                shouldShowByType = card.classList.contains('work-project');
            }
            
            // Then apply the regular filters
            let shouldShowByCategory = true;
            
            if (projectState.activeFilter !== 'all') {
                if (projectState.activeFilter === 'archive') {
                    shouldShowByCategory = card.hasAttribute('data-archive');
                } else if (projectState.activeFilter === 'minecraft') {
                    shouldShowByCategory = card.hasAttribute('data-minecraft');
                } else if (projectState.activeFilter === 'discord') {
                    shouldShowByCategory = card.hasAttribute('data-discord');
                } else {
                    // Check if card has matching language or tech
                    shouldShowByCategory = card.hasAttribute(`data-${projectState.activeFilter.toLowerCase()}`);
                }
            }
            
            // Apply visibility - must pass both filters
            const shouldShow = shouldShowByType && shouldShowByCategory;
            card.style.display = shouldShow ? 'flex' : 'none';
            
            if (shouldShow) {
                visibleCount++;
                if (card.classList.contains('personal-project')) personalCount++;
                if (card.classList.contains('work-project')) workCount++;
            }
        });
        
        console.log(`Filter results: ${visibleCount} projects visible (${personalCount} personal, ${workCount} work)`);
        
        // Update the project summary if it exists
        const summaryEl = document.querySelector('.project-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <p>Showing <strong>${visibleCount}</strong> projects 
                (<span class="personal-count">${personalCount} personal</span>, 
                <span class="work-count">${workCount} work</span>)</p>
            `;
        }
        
        // Show message if no projects match the filter
        if (visibleCount === 0) {
            const noMatchMessage = document.createElement('div');
            noMatchMessage.className = 'no-matches-message';
            
            // Customize message based on filters
            let message = `<p>No projects match the "${projectState.activeFilter}" filter`;
            if (projectState.showMode !== 'all') {
                message += ` in the "${projectState.showMode}" category`;
            }
            message += '.</p>';
            
            noMatchMessage.innerHTML = message;
            
            // Check if message already exists
            const existingMessage = projectGrid.querySelector('.no-matches-message');
            if (existingMessage) {
                projectGrid.removeChild(existingMessage);
            }
            
            projectGrid.appendChild(noMatchMessage);
        } else {
            // Remove any no matches message if it exists
            const existingMessage = projectGrid.querySelector('.no-matches-message');
            if (existingMessage) {
                projectGrid.removeChild(existingMessage);
            }
        }
        
        // Remove filtering class
        projectGrid.classList.remove('filtering');
    }, 300); // Match this with the CSS transition time
}

// Add a global function that can be called from the HTML to retry loading
window.retryLoadProjects = function() {
    console.log("Manual retry initiated");
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) {
        console.error("Could not find projects-container element");
        return;
    }
    
    projectsContainer.innerHTML = '<div class="loading">Loading projects...</div>';
    fetchProjects();
};

// Add CSS for missing tech badge colors and UI improvements
function addMissingStyles() {
    // Check if styles already exist
    const styleId = 'additional-tech-badge-styles';
    if (document.getElementById(styleId)) {
        return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
        .tech-badge.html {
            background-color: rgba(227, 76, 38, 0.2);
            color: #e34c26;
            border-color: #e34c26;
        }
        
        .tech-badge.css {
            background-color: rgba(21, 114, 182, 0.2);
            color: #1572b6;
            border-color: #1572b6;
        }
        
        .tech-badge.github {
            background-color: rgba(110, 84, 148, 0.2);
            color: #6e5494;
            border-color: #6e5494;
        }
        
        .tech-badge.markdown {
            background-color: rgba(0, 0, 0, 0.2);
            color: #ffffff;
            border-color: #000000;
        }
        
        .tech-badge.webdev {
            background-color: rgba(66, 184, 131, 0.2);
            color: #42b883;
            border-color: #42b883;
        }
        
        .no-matches-message {
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px;
            color: var(--light-text);
            font-style: italic;
        }
        
        .retry-btn {
            background-color: var(--primary-color);
            color: var(--text-color);
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 15px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        
        .retry-btn:hover {
            background-color: var(--accent-color);
            transform: translateY(-2px);
        }
        
        .error-card {
            background-color: rgba(255, 0, 0, 0.1);
            border-color: #ff0000;
        }
        
        /* Make timestamps more prominent */
        .project-updated {
            font-style: italic;
            padding: 5px 0;
        }
        
        /* Add tooltip-style hint for local time */
        .project-updated i {
            margin-right: 5px;
            color: var(--accent-color);
        }
        
        /* Organization Badge Styles */
        .org-badge {
            display: inline-block;
            background-color: #2C5A7A; /* A blue shade for organization */
            color: #FFFFFF;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
        }
        
        /* Make the organization badge animate on hover */
        .project-card:hover .org-badge {
            background-color: #3B8BC9; /* Lighter blue on hover */
            transform: scale(1.05);
            transition: all 0.2s ease;
        }
        
        /* Styling for work projects */
        .project-card.work-project {
            border-left: 3px solid #2C5A7A; /* Blue border */
        }
        
        .project-card.work-project:hover {
            border-color: #3B8BC9; /* Lighter blue on hover */
        }
        
        .project-card.personal-project {
            border-left: 3px solid var(--primary-color); /* Existing primary color */
        }

        /* No Projects message styling */
        .no-projects {
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px;
            background-color: var(--card-bg);
            border-radius: 8px;
            border: 1px solid var(--border-color);
            color: var(--light-text);
        }
        
        .no-projects p {
            margin-bottom: 20px;
        }
        
        /* Work/Personal toggle styling */
        .project-type-toggle {
            margin: 10px 0 30px;
            text-align: center;
        }
        
        .toggle-container {
            display: inline-flex;
            align-items: center;
            background-color: var(--card-bg);
            border-radius: 30px;
            padding: 5px 15px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border-color);
        }
        
        .toggle-label {
            margin-right: 10px;
            font-weight: 600;
            color: var(--light-text);
        }
        
        .toggle-buttons {
            display: flex;
            gap: 5px;
        }
        
        .toggle-btn {
            padding: 8px 16px;
            border-radius: 20px;
            border: none;
            background-color: transparent;
            color: var(--text-color);
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .toggle-btn:hover {
            background-color: var(--hover-color);
        }
        
        .toggle-btn.active {
            background-color: var(--primary-color);
            color: white;
        }
        
        .toggle-btn[data-show="work"].active {
            background-color: #2C5A7A;
        }
        
        .toggle-btn[data-show="personal"].active {
            background-color: var(--primary-color);
        }
        
        .toggle-btn[data-show="all"].active {
            background: linear-gradient(to right, var(--primary-color), #2C5A7A);
        }
        
        /* Project summary styling */
        .project-summary {
            text-align: center;
            margin-bottom: 20px;
            color: var(--light-text);
            font-size: 0.9rem;
        }
        
        .project-summary .personal-count {
            color: var(--primary-color);
            font-weight: 600;
        }
        
        .project-summary .work-count {
            color: #3B8BC9;
            font-weight: 600;
        }
        
        /* Animation for filtering */
        .project-grid {
            transition: opacity 0.3s ease;
        }
        
        .project-grid.filtering {
            opacity: 0.5;
        }
        
        /* Project card transitions */
        .project-card {
            transition: all 0.3s ease, opacity 0.5s ease, transform 0.3s ease;
        }
        
        /* Add a loading spinner */
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--light-text);
        }
        
        .loading:after {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            margin-left: 10px;
            border: 2px solid var(--primary-color);
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Call the function to add missing styles
addMissingStyles();
