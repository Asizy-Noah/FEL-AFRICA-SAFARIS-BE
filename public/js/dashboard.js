document.addEventListener('DOMContentLoaded', function() {
    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth < 992 && 
            !sidebar.contains(event.target) && 
            !mobileToggle.contains(event.target) && 
            sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
        }
    });
    
    // Initialize Charts
    initBookingsChart();
    initCountriesChart();
    
    // Year Select Change
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
        yearSelect.addEventListener('change', function() {
            initBookingsChart();
        });
    }
});

// Bookings Chart
function initBookingsChart() {
    const ctx = document.getElementById('bookingsChart');
    
    if (!ctx) return;
    
    // Get selected year
    const yearSelect = document.getElementById('yearSelect');
    const selectedYear = yearSelect ? yearSelect.value : '2025';
    
    // Sample data - in a real app, this would come from an API
    const data = {
        '2025': {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            values: [52, 23, 18, 25, 32, 28, 36, 45, 52, 38, 42, 48]
        },
        '2024': {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            values: [48, 35, 28, 32, 38, 42, 50, 55, 48, 42, 38, 45]
        },
        '2023': {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            values: [35, 28, 22, 30, 35, 40, 45, 50, 42, 38, 32, 40]
        }
    };
    
    // Destroy existing chart if it exists
    if (window.bookingsChart instanceof Chart) {
        window.bookingsChart.destroy();
    }
    
    // Create new chart
    window.bookingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data[selectedYear].labels,
            datasets: [{
                label: `Bookings in ${selectedYear}`,
                data: data[selectedYear].values,
                backgroundColor: '#59b46f',
                borderColor: '#59b46f',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Countries Chart
function initCountriesChart() {
    const ctx = document.getElementById('countriesChart');
    
    if (!ctx) return;
    
    // Sample data - in a real app, this would come from an API
    const countries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'China', 'India', 'Brazil', 'Mexico', 'Spain', 'Italy', 'Russia', 'South Africa'];
    const bookings = [15, 68, 8, 22, 18, 12, 8, 5, 7, 10, 6, 12, 8, 5, 20];
    
    // Destroy existing chart if it exists
    if (window.countriesChart instanceof Chart) {
        window.countriesChart.destroy();
    }
    
    // Create new chart
    window.countriesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: countries,
            datasets: [{
                label: 'Bookings',
                data: bookings,
                fill: false,
                borderColor: '#e74c3c',
                tension: 0.1,
                pointBackgroundColor: '#e74c3c',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#e74c3c'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// public/js/add-tour.js (or wherever your JS is located)

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Quill editor for Tour Overview
    const tourOverviewEditor = new Quill('#tourOverviewEditor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                ['link', 'image', 'video']
            ]
        },
        placeholder: 'Type tour description here...'
    });

    // Initialize Quill editor for initial itinerary (if present)
    // This is important for when oldInput is populated
    document.querySelectorAll('.itinerary-editor').forEach((editor, index) => {
        initItineraryEditor(index, editor);
    });

    // Handle form submission
    document.getElementById('addTourForm').addEventListener('submit', function(e) {
        // Populate hidden input for Tour Overview Quill editor
        document.getElementById('tourOverview').value = tourOverviewEditor.root.innerHTML;

        // Populate hidden inputs for all itinerary Quill editors
        document.querySelectorAll('.itinerary-editor').forEach((editor, index) => {
            const quill = Quill.find(editor);
            // Ensure quill instance exists for the editor
            if (quill) {
                const hiddenInput = document.querySelector(`input[name="itineraries[${index}][description]"]`);
                if (hiddenInput) {
                    hiddenInput.value = quill.root.innerHTML;
                }
            }
        });

        // DO NOT call e.preventDefault() here unless you plan to use AJAX.
        // Allowing the default behavior means the form will submit to the server.
        // Remove 'alert' and client-side 'window.location.href' as the server will handle redirects.
    });

    // Handle file upload preview
    document.getElementById('coverImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = ''; // Clear previous preview

        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                preview.innerHTML = `<img src="${event.target.result}" alt="Preview" style="max-width: 100%; height: auto; display: block;">`;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
        }
    });

    // Add new itinerary
    document.getElementById('addItineraryBtn').addEventListener('click', function() {
        const itinerariesContainer = document.getElementById('itinerariesContainer');
        const itineraryCount = itinerariesContainer.querySelectorAll('.itinerary-item').length;
        const newIndex = itineraryCount;

        // Create new itinerary item
        const itineraryItem = document.createElement('div');
        itineraryItem.className = 'itinerary-item';
        itineraryItem.innerHTML = `
            <div class="itinerary-header">
                <h4>Itinerary ${newIndex + 1}</h4>
                <button type="button" class="remove-itinerary-btn" title="Remove Itinerary">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="form-row">
                <div class="form-group col-md-2">
                    <label>Day</label>
                    <input type="text" name="itineraries[${newIndex}][day]" class="form-control"  value="${newIndex + 1}" required>
                </div>

                <div class="form-group col-md-10">
                    <label>Itinerary Title</label>
                    <input type="text" name="itineraries[${newIndex}][title]" class="form-control" required>
                </div>
            </div>

            <div class="form-group">
                <label>Itinerary Description</label>
                <div class="itinerary-editor editor-container"></div>
                <input type="hidden" name="itineraries[${newIndex}][description]">
            </div>

            <div class="form-row">
                <div class="form-group col-md-6">
                    <label>Meal Plan</label>
                    <select name="itineraries[${newIndex}][meals]" class="form-control" required>
                        <option value="">Select Meal Plan</option>
                        <option value="Lunch & Dinner">Lunch & Dinner</option>
                        <option value="Breakfast, Lunch & Dinner">Breakfast, Lunch & Dinner</option>
                        <option value="Breakfast & Lunch">Breakfast & Lunch</option>
                        <option value="Breakfast Only">Breakfast Only</option>
                    </select>
                </div>

                <div class="form-group col-md-6">
                    <label>Accommodation</label>
                    <input type="text" name="itineraries[${newIndex}][accommodation]" class="form-control" placeholder="e.g., Serena Lodge or similar">
                </div>
            </div>
        `;

        // Add to container
        itinerariesContainer.appendChild(itineraryItem);

        // Initialize Quill editor for new itinerary
        // Pass the specific editor element to the init function
        initItineraryEditor(newIndex, itineraryItem.querySelector('.itinerary-editor'));

        // Add event listener for remove button
        itineraryItem.querySelector('.remove-itinerary-btn').addEventListener('click', function() {
            if (confirm('Are you sure you want to remove this itinerary?')) {
                itineraryItem.remove();
                updateItineraryNumbers();
            }
        });
    });

    // Delegate event listener for remove buttons
    document.getElementById('itinerariesContainer').addEventListener('click', function(e) {
        if (e.target.closest('.remove-itinerary-btn')) {
            const button = e.target.closest('.remove-itinerary-btn');
            const itineraryItem = button.closest('.itinerary-item');
            if (itineraryItem) {
                if (document.querySelectorAll('.itinerary-item').length > 1) {
                    if (confirm('Are you sure you want to remove this itinerary?')) {
                        itineraryItem.remove();
                        updateItineraryNumbers();
                    }
                } else {
                    alert('You must have at least one itinerary.');
                }
            }
        }
    });

    // Function to initialize Quill editor for itinerary
    // Pass the specific editor element
    function initItineraryEditor(index, editorElement) {
        // Ensure editorElement exists and has not been initialized
        if (editorElement && !editorElement.classList.contains('ql-container')) {
            new Quill(editorElement, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link']
                    ]
                },
                placeholder: 'Describe the activities for this day...'
            });
        }
    }

    // Function to update itinerary numbers after removal
    function updateItineraryNumbers() {
        const itineraryItems = document.querySelectorAll('.itinerary-item');
        itineraryItems.forEach((item, index) => {
            // Update header
            item.querySelector('h4').textContent = `Itinerary ${index + 1}`;

            // Update day input default value (only if it was the default)
            const dayInput = item.querySelector('input[name^="itineraries"][name$="[day]"]');
            if (dayInput && dayInput.defaultValue === String(index + 1)) { // Check defaultValue against expected day
                 dayInput.value = index + 1; // Update actual value if it's the default
            } else if (dayInput && dayInput.value === String(index + 2)) { // If it was the next day before removal
                dayInput.value = index + 1;
            }


            // Update all input names
            item.querySelectorAll('[name^="itineraries["]').forEach(input => {
                const name = input.getAttribute('name');
                const newName = name.replace(/itineraries\[\d+\]/, `itineraries[${index}]`);
                input.setAttribute('name', newName);
            });

            // Re-initialize Quill editors for existing itineraries if needed (careful with this)
            // This is generally not needed if the Quill instances are managed correctly on creation/removal.
            // But if issues persist, you might need a way to re-associate or re-create Quill instances
            // for existing editors whose indices changed. For now, rely on existing instances.
        });
    }
});


document.addEventListener('DOMContentLoaded', function() {
    // Initialize Quill editor for blog content if on add/edit page
    if (document.getElementById('blogContentEditor')) {
        var Quill; // Declare Quill
        Quill = (typeof Quill !== 'undefined') ? Quill : {}; // Assign Quill if it's not already defined
        const blogContentEditor = new Quill('#blogContentEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'direction': 'rtl' }],
                    [{ 'align': [] }],
                    ['link', 'image', 'video'],
                    ['clean']
                ]
            },
            placeholder: 'Write your blog content here...'
        });
        
        // Handle file upload preview
        const featuredImageInput = document.getElementById('featuredImage');
        if (featuredImageInput) {
            featuredImageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const preview = document.getElementById('imagePreview');
                        preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // Handle form submission
        const blogForm = document.getElementById('addBlogForm') || document.getElementById('editBlogForm');
        if (blogForm) {
            blogForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get content from Quill editor and set to hidden input
                document.getElementById('blogContent').value = blogContentEditor.root.innerHTML;
                
                // Show success message
                if (window.location.pathname.includes('add-blog')) {
                    alert('Blog post published successfully!');
                } else {
                    alert('Blog post updated successfully!');
                }
                
                // Redirect to updates page
                window.location.href = 'updates.html';
            });
        }
    }
    
    // Blog filtering functionality
    const blogTypeFilter = document.getElementById('blogTypeFilter');
    const blogSearchInput = document.getElementById('blogSearchInput');
    const blogSortFilter = document.getElementById('blogSortFilter');
    
    if (blogTypeFilter) {
        // Filter blogs by type (visible/hidden)
        blogTypeFilter.addEventListener('change', filterBlogs);
    }
    
    if (blogSearchInput) {
        // Filter blogs by search term
        blogSearchInput.addEventListener('input', filterBlogs);
    }
    
    if (blogSortFilter) {
        // Sort blogs
        blogSortFilter.addEventListener('change', sortBlogs);
    }
    
    function filterBlogs() {
        const filterValue = blogTypeFilter ? blogTypeFilter.value : 'all';
        const searchTerm = blogSearchInput ? blogSearchInput.value.toLowerCase() : '';
        const blogCards = document.querySelectorAll('.blog-card');
        
        blogCards.forEach(card => {
            const status = card.getAttribute('data-status');
            const title = card.querySelector('.blog-title').textContent.toLowerCase();
            
            // Check if card matches filter criteria
            const matchesFilter = filterValue === 'all' || status === filterValue;
            const matchesSearch = searchTerm === '' || title.includes(searchTerm);
            
            // Show/hide card based on filter
            if (matchesFilter && matchesSearch) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update pagination if needed
        updatePagination();
    }
    
    function sortBlogs() {
        const sortValue = blogSortFilter.value;
        const blogGrid = document.querySelector('.blog-grid');
        const blogCards = Array.from(document.querySelectorAll('.blog-card'));
        
        // Sort the blog cards
        blogCards.sort((a, b) => {
            const titleA = a.querySelector('.blog-title').textContent;
            const titleB = b.querySelector('.blog-title').textContent;
            
            if (sortValue === 'title') {
                return titleA.localeCompare(titleB);
            } else if (sortValue === 'title-desc') {
                return titleB.localeCompare(titleA);
            }
            
            // For demo purposes, we'll use the order in the DOM for newest/oldest
            // In a real app, you would compare dates
            if (sortValue === 'newest') {
                return -1; // Keep original order for demo
            } else if (sortValue === 'oldest') {
                return 1; // Reverse order for demo
            }
            
            return 0;
        });
        
        // Remove all cards from the grid
        blogCards.forEach(card => card.remove());
        
        // Add sorted cards back to the grid
        blogCards.forEach(card => blogGrid.appendChild(card));
        
        // Apply current filters
        filterBlogs();
    }
    
    function updatePagination() {
        // This is a placeholder for pagination update logic
        // In a real application, you would update the pagination based on the filtered results
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Review filtering functionality
    const reviewStatusFilter = document.getElementById('reviewStatusFilter');
    const reviewSearchInput = document.getElementById('reviewSearchInput');
    
    if (reviewStatusFilter) {
        // Filter reviews by status
        reviewStatusFilter.addEventListener('change', filterReviews);
    }
    
    if (reviewSearchInput) {
        // Filter reviews by search term
        reviewSearchInput.addEventListener('input', filterReviews);
    }
    
    function filterReviews() {
        const filterValue = reviewStatusFilter ? reviewStatusFilter.value : 'all';
        const searchTerm = reviewSearchInput ? reviewSearchInput.value.toLowerCase() : '';
        const reviewRows = document.querySelectorAll('.reviews-table tbody tr');
        let visibleCount = 0;
        
        reviewRows.forEach(row => {
            const status = row.getAttribute('data-status');
            const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const review = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
            
            // Check if row matches filter criteria
            const matchesFilter = filterValue === 'all' || status === filterValue;
            const matchesSearch = searchTerm === '' || 
                                 name.includes(searchTerm) || 
                                 review.includes(searchTerm);
            
            // Show/hide row based on filter
            if (matchesFilter && matchesSearch) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update record count
        const recordsCount = document.querySelector('.records-count');
        if (recordsCount) {
            recordsCount.textContent = visibleCount;
        }
        
        // Update pagination if needed
        updatePagination();
    }
    
    function updatePagination() {
        // This is a placeholder for pagination update logic
        // In a real application, you would update the pagination based on the filtered results
    }
    
    // Handle select all checkbox
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(checkbox => {
                const row = checkbox.closest('tr');
                if (row.style.display !== 'none') {
                    checkbox.checked = selectAllCheckbox.checked;
                }
            });
        });
    }
    
    // Handle review action buttons
    const approveButtons = document.querySelectorAll('.approve-btn:not([disabled])');
    const disapproveButtons = document.querySelectorAll('.disapprove-btn:not([disabled])');
    const editButtons = document.querySelectorAll('.edit-btn');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    
    // Approve review
    approveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const statusCell = row.querySelector('td:nth-child(6)');
            
            // Update status
            row.setAttribute('data-status', 'posted');
            statusCell.innerHTML = '<span class="status-badge posted">Posted</span>';
            
            // Disable approve button and enable disapprove button
            this.disabled = true;
            row.querySelector('.disapprove-btn').disabled = false;
            
            // Show success message
            alert('Review approved and published successfully!');
            
            // Re-apply filters
            filterReviews();
        });
    });
    
    // Disapprove review
    disapproveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const statusCell = row.querySelector('td:nth-child(6)');
            
            // Update status
            row.setAttribute('data-status', 'disapproved');
            statusCell.innerHTML = '<span class="status-badge disapproved">Disapproved</span>';
            
            // Disable disapprove button and enable approve button
            this.disabled = true;
            row.querySelector('.approve-btn').disabled = false;
            
            // Show success message
            alert('Review disapproved successfully!');
            
            // Re-apply filters
            filterReviews();
        });
    });
    
    // Edit review (placeholder)
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const name = row.querySelector('td:nth-child(2)').textContent;
            
            // In a real application, this would open an edit form or modal
            alert(`Edit review from ${name}`);
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    
    
    // Handle file upload preview
    const coverImageInput = document.getElementById('coverImage');
    if (coverImageInput) {
        coverImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('imagePreview');
                    preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Category filtering functionality
    const categorySearchInput = document.getElementById('categorySearchInput');
    const categoryCountryFilter = document.getElementById('categoryCountryFilter');
    const refreshButton = document.getElementById('refreshCategories');
    
    // Function to filter categories based on search term and country
    function filterCategories() {
        const searchTerm = categorySearchInput ? categorySearchInput.value.toLowerCase() : '';
        const countryFilter = categoryCountryFilter ? categoryCountryFilter.value : 'all';
        const categoryCards = document.querySelectorAll('.category-card');
        
        categoryCards.forEach(card => {
            const title = card.querySelector('.category-title').textContent.toLowerCase();
            const country = card.getAttribute('data-country');
            
            // Check if card matches both search term and country filter
            const matchesSearch = title.includes(searchTerm);
            const matchesCountry = countryFilter === 'all' || country === countryFilter;
            
            // Show/hide card based on filters
            if (matchesSearch && matchesCountry) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    // Add event listeners for filtering
    if (categorySearchInput) {
        categorySearchInput.addEventListener('input', filterCategories);
    }
    
    if (categoryCountryFilter) {
        categoryCountryFilter.addEventListener('change', filterCategories);
    }
    
    // Add event listener for refresh button
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Reset filters
            if (categorySearchInput) categorySearchInput.value = '';
            if (categoryCountryFilter) categoryCountryFilter.value = 'all';
            
            // Show all categories
            const categoryCards = document.querySelectorAll('.category-card');
            categoryCards.forEach(card => {
                card.style.display = '';
            });
            
            // Add a spinning animation to the refresh button
            this.classList.add('refreshing');
            setTimeout(() => {
                this.classList.remove('refreshing');
            }, 1000);
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Agent filtering functionality
    const agentSearchInput = document.getElementById('agentSearchInput');
    const agentCountryFilter = document.getElementById('agentCountryFilter');
    const refreshButton = document.getElementById('refreshAgents');
    
    // Function to filter agents based on search term and country
    function filterAgents() {
        const searchTerm = agentSearchInput ? agentSearchInput.value.toLowerCase() : '';
        const countryFilter = agentCountryFilter ? agentCountryFilter.value : 'all';
        const agentCards = document.querySelectorAll('.agent-card');
        let visibleCount = 0;
        
        agentCards.forEach(card => {
            const name = card.querySelector('.agent-name').textContent.toLowerCase();
            const email = card.querySelector('.agent-details .detail-value').textContent.toLowerCase();
            const country = card.getAttribute('data-country');
            
            // Check if card matches both search term and country filter
            const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
            const matchesCountry = countryFilter === 'all' || country === countryFilter;
            
            // Show/hide card based on filters
            if (matchesSearch && matchesCountry) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    // Add event listeners for filtering
    if (agentSearchInput) {
        agentSearchInput.addEventListener('input', filterAgents);
    }
    
    if (agentCountryFilter) {
        agentCountryFilter.addEventListener('change', filterAgents);
    }
    
    // Add event listener for refresh button
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Reset filters
            if (agentSearchInput) agentSearchInput.value = '';
            if (agentCountryFilter) agentCountryFilter.value = 'all';
            
            // Show all agents
            const agentCards = document.querySelectorAll('.agent-card');
            agentCards.forEach(card => {
                card.style.display = '';
            });
            
            // Add a spinning animation to the refresh button
            this.classList.add('refreshing');
            setTimeout(() => {
                this.classList.remove('refreshing');
            }, 1000);
        });
    }
    
    // Handle activate/deactivate buttons
    const deactivateButtons = document.querySelectorAll('.deactivate-btn');
    const activateButtons = document.querySelectorAll('.activate-btn');
    
    deactivateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.agent-card');
            const name = card.querySelector('.agent-name').textContent;
            
            if (confirm(`Are you sure you want to deactivate ${name}?`)) {
                // Update status icon
                const statusIcon = card.querySelector('.agent-status');
                statusIcon.classList.remove('active');
                statusIcon.classList.add('inactive');
                statusIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
                
                // Replace deactivate button with activate button
                this.textContent = 'Activate';
                this.classList.remove('btn-danger', 'deactivate-btn');
                this.classList.add('btn-success', 'activate-btn');
                
                // Show success message
                alert(`${name} has been deactivated.`);
            }
        });
    });
    
    activateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.agent-card');
            const name = card.querySelector('.agent-name').textContent;
            
            if (confirm(`Are you sure you want to activate ${name}?`)) {
                // Update status icon
                const statusIcon = card.querySelector('.agent-status');
                statusIcon.classList.remove('inactive');
                statusIcon.classList.add('active');
                statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                
                // Replace activate button with deactivate button
                this.textContent = 'Deactivate';
                this.classList.remove('btn-success', 'activate-btn');
                this.classList.add('btn-danger', 'deactivate-btn');
                
                // Show success message
                alert(`${name} has been activated.`);
            }
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    // Subscriber filtering functionality
    const subscriberSearchInput = document.getElementById('subscriberSearchInput');
    const subscribersPerPage = document.getElementById('subscribersPerPage');
    const selectAllCheckbox = document.getElementById('selectAll');
    
    // Function to filter subscribers based on search term
    function filterSubscribers() {
        const searchTerm = subscriberSearchInput ? subscriberSearchInput.value.toLowerCase() : '';
        const subscriberRows = document.querySelectorAll('.subscribers-table tbody tr');
        let visibleCount = 0;
        
        subscriberRows.forEach(row => {
            const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const email = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
            const phone = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
            
            // Check if row matches search term
            const matchesSearch = name.includes(searchTerm) || 
                                 email.includes(searchTerm) || 
                                 phone.includes(searchTerm);
            
            // Show/hide row based on filter
            if (matchesSearch) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update record count
        const recordsCount = document.querySelector('.records-count');
        if (recordsCount) {
            recordsCount.textContent = visibleCount;
        }
        
        // Update pagination if needed
        updatePagination();
    }
    
    function updatePagination() {
        // This is a placeholder for pagination update logic
        // In a real application, you would update the pagination based on the filtered results
    }
    
    // Add event listener for search input
    if (subscriberSearchInput) {
        subscriberSearchInput.addEventListener('input', filterSubscribers);
    }
    
    // Add event listener for subscribers per page select
    if (subscribersPerPage) {
        subscribersPerPage.addEventListener('change', function() {
            // In a real application, this would update the number of rows displayed per page
            alert(`Showing ${this.value} subscribers per page.`);
            
            // Update pagination
            updatePagination();
        });
    }
    
    // Handle select all checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(checkbox => {
                const row = checkbox.closest('tr');
                if (row.style.display !== 'none') {
                    checkbox.checked = selectAllCheckbox.checked;
                }
            });
        });
    }
    
    // Handle table sorting
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const columnIndex = Array.from(header.parentNode.children).indexOf(header);
            const isAscending = header.classList.contains('sort-asc');
            
            // Remove sort classes from all headers
            sortableHeaders.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            
            // Add sort class to current header
            if (isAscending) {
                header.classList.add('sort-desc');
            } else {
                header.classList.add('sort-asc');
            }
            
            // Sort the table rows
            const tbody = document.querySelector('.subscribers-table tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            rows.sort((a, b) => {
                const aValue = a.children[columnIndex].textContent.trim();
                const bValue = b.children[columnIndex].textContent.trim();
                
                // Handle date sorting
                if (columnIndex === 4) { // Date column
                    return isAscending ? 
                        new Date(bValue) - new Date(aValue) : 
                        new Date(aValue) - new Date(bValue);
                }
                
                // Handle text sorting
                return isAscending ? 
                    bValue.localeCompare(aValue) : 
                    aValue.localeCompare(bValue);
            });
            
            // Reorder the rows in the table
            rows.forEach(row => {
                tbody.appendChild(row);
            });
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    // Initialize Quill editor for page content if on add/edit page
    if (document.getElementById('pageContentEditor')) {
        // Initialize Quill
        const Quill = window.Quill;
        
        const pageContentEditor = new Quill('#pageContentEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'align': [] }],
                    ['link', 'image', 'video'],
                    ['clean']
                ]
            },
            placeholder: 'Write page content here...'
        });
        
        // If we're on the edit page, populate the editor with content
        if (window.location.pathname.includes('edit-page')) {
            // This is sample content for demonstration
            const sampleContent = `
                <h2>About Feel Africa Safaris</h2>
                <p>Welcome to Feel Africa Safaris, your premier safari tour operator in East Africa. We specialize in creating unforgettable wildlife experiences in Uganda, Kenya, Tanzania, and Rwanda.</p>
                
                <h3>Our Story</h3>
                <p>Founded in 2018 by a group of passionate wildlife enthusiasts and experienced safari guides, Feel Africa Safaris was born out of a deep love for Africa's incredible wildlife and a desire to share it with the world. What started as a small operation has grown into one of the most respected safari companies in East Africa, known for our exceptional service, knowledgeable guides, and commitment to sustainable tourism.</p>
                
                <h3>Our Mission</h3>
                <p>Our mission is to provide exceptional safari experiences that connect people with the natural wonders of Africa while promoting conservation and supporting local communities. We believe that responsible tourism can be a powerful force for good, and we strive to make a positive impact in everything we do.</p>
                
                <h3>Our Team</h3>
                <p>Our team consists of experienced safari guides, wildlife experts, and travel professionals who are passionate about what they do. All of our guides are locally born and raised, with intimate knowledge of the areas we visit and the wildlife that inhabits them. They are not just guides, but storytellers, conservationists, and ambassadors for their countries.</p>
                
                <h3>Our Commitment to Sustainability</h3>
                <p>At Feel Africa Safaris, we are committed to sustainable and responsible tourism. We work closely with local communities, conservation organizations, and national parks to ensure that our operations have a positive impact on the environment and the people who call these areas home. A portion of every safari we operate goes directly to conservation efforts and community development projects.</p>
                
                <h3>Why Choose Us?</h3>
                <ul>
                    <li><strong>Local Expertise:</strong> Our guides are born and raised in the areas we visit, with unparalleled knowledge of the wildlife, culture, and landscapes.</li>
                    <li><strong>Personalized Service:</strong> We tailor each safari to meet the specific interests, needs, and budget of our clients.</li>
                    <li><strong>Quality Accommodations:</strong> From luxury lodges to comfortable tented camps, we select accommodations that offer the best combination of comfort, location, and value.</li>
                    <li><strong>Responsible Tourism:</strong> We are committed to sustainable practices and supporting local communities and conservation efforts.</li>
                    <li><strong>Unforgettable Experiences:</strong> We go beyond the ordinary to create safari experiences that will stay with you for a lifetime.</li>
                </ul>
                
                <p>We invite you to join us on a journey of discovery through the wild heart of Africa. Contact us today to start planning your adventure of a lifetime.</p>
            `;
            
            pageContentEditor.clipboard.dangerouslyPasteHTML(sampleContent);
            
            // Show the current image preview
            document.getElementById('coverImagePreview').style.display = 'block';
            document.getElementById('galleryImagesPreview').style.display = 'block';
            document.getElementById('seoOgImagePreview').style.display = 'block';
        }
        
        // Handle form submission
        const pageForm = document.getElementById('addPageForm') || document.getElementById('editPageForm');
        if (pageForm) {
            pageForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get content from Quill editor and set to hidden input
                document.getElementById('pageContent').value = pageContentEditor.root.innerHTML;
                
                // Show success message
                if (window.location.pathname.includes('add-page')) {
                    alert('Page added successfully!');
                } else {
                    alert('Page updated successfully!');
                }
                
                // Redirect to pages page
                window.location.href = 'pages.html';
            });
        }
    }
    
    // Handle file upload preview
    const coverImageInput = document.getElementById('pageCoverImage');
    if (coverImageInput) {
        coverImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('coverImagePreview');
                    preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    const galleryImagesInput = document.getElementById('pageGalleryImages');
    if (galleryImagesInput) {
        galleryImagesInput.addEventListener('change', function(e) {
            const files = e.target.files;
            if (files.length > 0) {
                const preview = document.getElementById('galleryImagesPreview');
                preview.innerHTML = '<div class="gallery-images"></div>';
                const galleryContainer = preview.querySelector('.gallery-images');
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const imageItem = document.createElement('div');
                        imageItem.className = 'gallery-image-item';
                        imageItem.innerHTML = `
                            <img src="${event.target.result}" alt="Gallery Image ${i + 1}">
                            <button type="button" class="remove-image-btn"><i class="fas fa-times"></i></button>
                        `;
                        galleryContainer.appendChild(imageItem);
                        
                        // Add event listener to remove button
                        const removeBtn = imageItem.querySelector('.remove-image-btn');
                        removeBtn.addEventListener('click', function() {
                            imageItem.remove();
                        });
                    };
                    reader.readAsDataURL(file);
                }
                
                preview.style.display = 'block';
            }
        });
    }
    
    const seoOgImageInput = document.getElementById('seoOgImage');
    if (seoOgImageInput) {
        seoOgImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('seoOgImagePreview');
                    preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Handle remove image buttons for existing gallery images
    const removeImageButtons = document.querySelectorAll('.remove-image-btn');
    if (removeImageButtons.length > 0) {
        removeImageButtons.forEach(button => {
            button.addEventListener('click', function() {
                const imageItem = this.closest('.gallery-image-item');
                imageItem.remove();
            });
        });
    }
    
    // Page filtering functionality
    const pageSearchInput = document.getElementById('pageSearchInput');
    const pagesPerPage = document.getElementById('pagesPerPage');
    const selectAllCheckbox = document.getElementById('selectAll');
    
    // Function to filter pages based on search term
    function filterPages() {
        const searchTerm = pageSearchInput ? pageSearchInput.value.toLowerCase() : '';
        const pageRows = document.querySelectorAll('.pages-table tbody tr');
        let visibleCount = 0;
        
        pageRows.forEach(row => {
            const title = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
            const description = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
            const keywords = row.querySelector('td:nth-child(5)').textContent.toLowerCase();
            
            // Check if row matches search term
            const matchesSearch = title.includes(searchTerm) || 
                                 description.includes(searchTerm) || 
                                 keywords.includes(searchTerm);
            
            // Show/hide row based on filter
            if (matchesSearch) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update record count
        const recordsCount = document.querySelector('.records-count');
        if (recordsCount) {
            recordsCount.textContent = visibleCount;
        }
        
        // Update pagination if needed
        updatePagination();
    }
    
    function updatePagination() {
        // This is a placeholder for pagination update logic
        // In a real application, you would update the pagination based on the filtered results
    }
    
    // Add event listener for search input
    if (pageSearchInput) {
        pageSearchInput.addEventListener('input', filterPages);
    }
    
    // Add event listener for pages per page select
    if (pagesPerPage) {
        pagesPerPage.addEventListener('change', function() {
            // In a real application, this would update the number of rows displayed per page
            alert(`Showing ${this.value} pages per page.`);
            
            // Update pagination
            updatePagination();
        });
    }
    
    // Handle select all checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(checkbox => {
                const row = checkbox.closest('tr');
                if (row.style.display !== 'none') {
                    checkbox.checked = selectAllCheckbox.checked;
                }
            });
        });
    }
    
    
    // Handle table sorting
    const sortableHeaders = document.querySelectorAll('.sortable');
    if (sortableHeaders.length > 0) {
        sortableHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const columnIndex = Array.from(header.parentNode.children).indexOf(header);
                const isAscending = header.classList.contains('sort-asc');
                
                // Remove sort classes from all headers
                sortableHeaders.forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                });
                
                // Add sort class to current header
                if (isAscending) {
                    header.classList.add('sort-desc');
                } else {
                    header.classList.add('sort-asc');
                }
                
                // Sort the table rows
                const tbody = document.querySelector('.pages-table tbody');
                const rows = Array.from(tbody.querySelectorAll('tr'));
                
                rows.sort((a, b) => {
                    const aValue = a.children[columnIndex].textContent.trim();
                    const bValue = b.children[columnIndex].textContent.trim();
                    
                    // Handle date sorting
                    if (columnIndex === 5) { // Last Modified column
                        return isAscending ? 
                            new Date(bValue) - new Date(aValue) : 
                            new Date(aValue) - new Date(bValue);
                    }
                    
                    // Handle text sorting
                    return isAscending ? 
                        bValue.localeCompare(aValue) : 
                        aValue.localeCompare(bValue);
                });
                
                // Reorder the rows in the table
                rows.forEach(row => {
                    tbody.appendChild(row);
                });
            });
        });
    }

    const seoDescription = document.getElementById('seoDescription');
    const charCount = document.getElementById('charCount');

    seoDescription.addEventListener('input', function () {
        let currentLength = seoDescription.value.length;
        charCount.textContent = `${currentLength} / 150`;

        if (currentLength >= 150) {
            seoDescription.style.color = 'red';
            charCount.style.color = 'red';
        } else {
            seoDescription.style.color = '';
            charCount.style.color = '';
        }
    });
});

/* ===Replace Image Logic */
/* === Updated Image Logic === */
document.addEventListener('DOMContentLoaded', () => {
    const replaceToggle = document.getElementById('replaceImageCheckbox');
    const uploadContainer = document.getElementById('uploadContainer');
    const imageInput = document.getElementById('coverImageInput');
    const imagePreview = document.getElementById('imagePreview');
    const dropZone = document.getElementById('dropZone');

    // 1. Handle Toggle logic
    if (replaceToggle) {
        replaceToggle.addEventListener('change', function() {
            if (this.checked) {
                uploadContainer.style.display = 'block';
                uploadContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                uploadContainer.style.display = 'none';
                imageInput.value = ''; 
                imagePreview.innerHTML = ''; 
            }
        });
    }

    // 2. MAKE THE BOX CLICKABLE (The missing link)
    if (dropZone && imageInput) {
        dropZone.addEventListener('click', () => {
            imageInput.click(); // This opens the file browser when the box is clicked
        });
    }

    // 3. Handle File Preview
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            imagePreview.innerHTML = ''; 
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.className = 'img-thumbnail mt-2';
                    img.style.maxHeight = '200px';
                    imagePreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 4. Drag and Drop Support
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('bg-light'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('bg-light'), false);
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt.files && dt.files.length > 0) {
                imageInput.files = dt.files;
                imageInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }
});