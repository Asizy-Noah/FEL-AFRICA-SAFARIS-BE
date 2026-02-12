// MultiSelect Component - Modern dropdown with multiple selection
// Usage: new MultiSelect('selectElementId', options)

window.multiSelectInstances = {};

class MultiSelect {
    constructor(selectId, options = {}) {
        this.select = document.getElementById(selectId);
        if (!this.select) return;

        this.options = {
            placeholder: options.placeholder || 'Select options',
            maxItems: options.maxItems || null,
            searchable: options.searchable !== false,
            ...options
        };

        this.selectId = selectId;
        this.selectedValues = [];
        this.filteredOptions = [];
        this.isOpen = false;

        this.init();
        window.multiSelectInstances[selectId] = this;
    }

    init() {
        // Get existing selected values
        this.updateSelectedValues();

        // Find or create the multiselect container
        const container = this.select.closest('.custom-multiselect-container');
        if (!container) return;

        this.container = container;
        this.trigger = container.querySelector('.multiselect-trigger');
        this.dropdown = container.querySelector('.multiselect-dropdown');
        this.tagsContainer = container.querySelector('.multiselect-tags');
        this.placeholder = container.querySelector('.multiselect-placeholder');
        this.searchInput = container.querySelector('.multiselect-search-input');
        this.optionsContainer = container.querySelector('.multiselect-options');

        // Hide the original select
        this.select.style.display = 'none';

        // Setup event listeners
        this.setupEventListeners();
        this.renderTags();
    }

    setupEventListeners() {
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Trigger click to open/close
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filterOptions(e.target.value);
            });
        }

        // Checkbox changes in dropdown
        const checkboxes = this.optionsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleCheckboxChange(e);
            });
        });

        // Tag close buttons
        this.tagsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-close')) {
                const value = e.target.dataset.value;
                this.removeValue(value);
            }
        });
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        this.dropdown.style.display = 'flex';
        this.trigger.classList.add('active');
        this.isOpen = true;
        
        // Focus search input
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    closeDropdown() {
        this.dropdown.style.display = 'none';
        this.trigger.classList.remove('active');
        this.isOpen = false;
        
        // Clear search
        if (this.searchInput) {
            this.searchInput.value = '';
        }
    }

    handleCheckboxChange(e) {
        const checkbox = e.target;
        const value = checkbox.value;
        const label = checkbox.dataset.label || checkbox.nextElementSibling?.textContent || value;

        if (checkbox.checked) {
            this.addValue(value, label);
        } else {
            this.removeValue(value);
        }
    }

    addValue(value, label) {
        if (!this.selectedValues.includes(value)) {
            // Check max items limit
            if (this.options.maxItems && this.selectedValues.length >= this.options.maxItems) {
                alert(`Maximum ${this.options.maxItems} item(s) can be selected`);
                return;
            }

            this.selectedValues.push(value);
            this.updateSelect();
            this.renderTags();
            this.updateCheckboxes();
        }
    }

    removeValue(value) {
        this.selectedValues = this.selectedValues.filter(v => v !== value);
        this.updateSelect();
        this.renderTags();
        this.updateCheckboxes();
    }

    updateSelectedValues() {
        this.selectedValues = Array.from(this.select.selectedOptions).map(option => option.value);
    }

    updateSelect() {
        // Update the select element's selected options
        Array.from(this.select.options).forEach(option => {
            option.selected = this.selectedValues.includes(option.value);
        });
    }

    updateCheckboxes() {
        const checkboxes = this.optionsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.selectedValues.includes(checkbox.value);
        });
    }

    renderTags() {
        this.tagsContainer.innerHTML = '';

        if (this.selectedValues.length === 0) {
            this.placeholder.style.display = 'block';
            return;
        }

        this.placeholder.style.display = 'none';

        this.selectedValues.forEach(value => {
            const option = Array.from(this.select.options).find(opt => opt.value === value);
            const label = option ? option.textContent : value;

            const tag = document.createElement('span');
            tag.className = 'multiselect-tag';
            tag.innerHTML = `
                <span class="tag-label">${label}</span>
                <button type="button" class="tag-close" data-value="${value}" tabindex="-1">
                    <i class="fas fa-times"></i>
                </button>
            `;

            this.tagsContainer.appendChild(tag);
        });
    }

    filterOptions(searchTerm) {
        const term = searchTerm.toLowerCase();
        const options = this.optionsContainer.querySelectorAll('.multiselect-option');

        options.forEach(option => {
            const label = option.querySelector('span').textContent.toLowerCase();
            if (label.includes(term)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    }

    updateDisplay() {
        this.updateSelectedValues();
        this.renderTags();
        this.updateCheckboxes();
    }
}

// Auto-initialize all multiselects with data-multiselect attribute
document.addEventListener('DOMContentLoaded', function() {
    const multiSelects = document.querySelectorAll('select[data-multiselect]');
    multiSelects.forEach(select => {
        new MultiSelect(select.id);
    });
});
