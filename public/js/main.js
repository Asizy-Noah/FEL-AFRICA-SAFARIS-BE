/* ============== Show Header ============== */
document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.header');
  var topSection = document.querySelector('.top-section');
  var headerHeight = header.clientHeight;
  var lastScrollTop = 0;

  function handleScroll() {
    var scrollTop = window.scrollY || window.pageYOffset;

    if (scrollTop > 100) {
      // Scrolling down by 100px or more
      header.style.display = 'none';
    } else {
      // Scrolling less than 100px down or at the top
      header.style.display = 'block';
    }

    if (scrollTop <= lastScrollTop || scrollTop === 0) {
      // Scrolling up or at the top
      header.classList.add('scroll-up'); // Add scroll-up class
      header.style.display = 'block'; // Ensure header is displayed when scrolling up or at the top
    } else {
      // Scrolling down
      header.classList.remove('scroll-up'); // Remove scroll-up class
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
  }

  // Add scroll event listener with throttling
  var isScrolling = false;
  window.addEventListener('scroll', function () {
    if (!isScrolling) {
      window.requestAnimationFrame(function () {
        handleScroll();
        isScrolling = false;
      });
      isScrolling = true;
    }
  });
});

/*=============== SHOW MENU ===============*/
const showMenu = (toggleId, navId) =>{
  const toggle = document.getElementById(toggleId),
        nav = document.getElementById(navId)

  toggle.addEventListener('click', () =>{
      // Add show-menu class to nav menu
      nav.classList.toggle('show-menu')

      // Add show-icon to show and hide the menu icon
      toggle.classList.toggle('show-icon')
  })
}

showMenu('nav-toggle','nav-menu')


// ================================
// ================================

const $ = window.jQuery
const i18next = window.i18next // Declare i18next variable
const updateLocalization = () => {
  // Placeholder for localization update logic
  console.log("Localization updated")
} // Declare updateLocalization function

// ================================
// TIME-BASED GREETING MESSAGE
// ================================
function updateGreeting() {
  const hour = new Date().getHours()
  const greetingEl = document.getElementById("greetingMessage")
  let greeting = "Good Morning"

  if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon"
  } else if (hour >= 17) {
    greeting = "Good Evening"
  }

  if (greetingEl) {
    greetingEl.textContent = greeting
  }
}


// ================================
// LANGUAGE TOGGLE FUNCTIONALITY
// ================================
const languageBtn = document.getElementById("languageBtn")
const languageDropdown = document.getElementById("languageDropdown")
const languageOptions = document.querySelectorAll(".language-option")

// Toggle dropdown
languageBtn.addEventListener("click", (e) => {
  e.stopPropagation()
  languageDropdown.classList.toggle("show")
})

// Language option selection
languageOptions.forEach((option) => {
  option.addEventListener("click", async (e) => {
    e.preventDefault()
    const lang = option.getAttribute("data-lang")

    // Set language in i18next
    await i18next.changeLanguage(lang)

    // Update UI
    updateLocalization()

    // Close dropdown
    languageDropdown.classList.remove("show")

    // Update active state
    languageOptions.forEach((opt) => opt.classList.remove("active"))
    option.classList.add("active")
  })
})

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".language-section")) {
    languageDropdown.classList.remove("show")
  }
})

// ================================
// NAVBAR ACTIVE LINK HIGHLIGHT
// ================================
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar")
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled")
  } else {
    navbar.classList.remove("scrolled")
  }
})

// ================================
// DESTINATION LIST TOGGLE - FIXED
// ================================

document.addEventListener('DOMContentLoaded', function () {
    const destinationToggle = document.querySelector('.destination-list-toggle');
    const navListRow = document.querySelector('.nav_list_row');
    const navDestinationsLi = document.querySelector('.nav_destinations > ul > li');
    const arrow = destinationToggle ? destinationToggle.querySelector('i') : null;

    if (!destinationToggle || !navListRow) return;

    // Toggle Function
    function toggleMenu(forceClose = false) {
        const isOpen = navListRow.style.display === 'flex';
        
        if (isOpen || forceClose) {
            navListRow.style.display = 'none';
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        } else {
            navListRow.style.display = 'flex';
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        }
    }

    // 1. Click Toggle
    destinationToggle.addEventListener('click', function (e) {
        e.stopPropagation(); // Prevents the document click listener from firing immediately
        toggleMenu();
    });

    // 2. Close when clicking outside
    document.addEventListener('click', function (e) {
        if (!navDestinationsLi.contains(e.target)) {
            toggleMenu(true); // Force close
        }
    });

    // 3. Close menu when selecting a destination item
    const destinationItems = navListRow.querySelectorAll('.nav_row_item');
    destinationItems.forEach(item => {
        item.addEventListener('click', () => toggleMenu(true));
    });
});


// ================================
// SLICK CAROUSEL INITIALIZATION
// ================================
$(document).ready(() => {
  $(".hero-carousel").slick({
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    dots: false,
    arrows: false,
    pauseOnHover: false,
    fade: true,
    cssEase: "ease-in-out",
    speed: 800,
  })

  // Testimonials carousel
  $(".testimonials-carousel").slick({
    infinite: true,
  slidesToShow: 3,
  slidesToScroll: 1, // Changed from 3 to 1 - moves one slide at a time
  autoplay: true,
  autoplaySpeed: 5000,
  dots: false,
  arrows: true,
  pauseOnHover: true,
  cssEase: "ease-in-out",
  speed: 800,
  responsive: [
    {
      breakpoint: 1200,
      settings: {
        slidesToShow: 3,
        slidesToScroll: 1, // Changed from 3 to 1
        infinite: true,
        dots: false
      }
    },
    {
      breakpoint: 992,
      settings: {
        slidesToShow: 2,
        slidesToScroll: 1, // Changed from 2 to 1
        infinite: true,
        dots: false
      }
    },
    {
      breakpoint: 768,
      settings: {
        slidesToShow: 2,
        slidesToScroll: 1, // Changed from 2 to 1
        dots: false
      }
    },
    {
      breakpoint: 576,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
        dots: false
      }
    }
  ]
  })

  $(".packages-carousel").slick({
    infinite: true,
    slidesToShow: 4,
    slidesToScroll: 1, // Changed from 4 to 1 for smoother transitions
    autoplay: true,
    autoplaySpeed: 5000,
    dots: false,
    arrows: true,
    pauseOnHover: true,
    cssEase: "ease-in-out",
    speed: 800,
    
    // Responsive breakpoints - adjusted for proper slide display
    responsive: [
      {
        breakpoint: 1400,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          dots: false
        }
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: true,
          dots: false
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: true,
          dots: false,
          arrows: true
        }
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
          dots: false,
          arrows: true,
          centerMode: false // Ensure full slide display
        }
      }
    ]
  })
})

// ================================
// SMOOTH SCROLL BEHAVIOR
// ================================
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault()
    const target = document.querySelector(this.getAttribute("href"))
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  })
})

// ================================
// CONTACT FORM HANDLING
// ================================
document.getElementById("contactForm")?.addEventListener("submit", function (e) {
  e.preventDefault()

  const formData = new FormData(this)
  console.log("Form submitted with data:", Object.fromEntries(formData))

  alert("Thank you for your message! We will get back to you soon.")
  this.reset()
})


// ================================
// BUTTON RIPPLE EFFECT
// ================================
document.querySelectorAll(".btn").forEach((button) => {
  button.addEventListener("click", function (e) {
    const ripple = document.createElement("span")
    const rect = this.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = size + "px"
    ripple.style.left = x + "px"
    ripple.style.top = y + "px"

    this.appendChild(ripple)

    setTimeout(() => ripple.remove(), 600)
  })
})

// ================================
// PAGE LOAD ANIMATION & INITIALIZATION
// ================================
window.addEventListener("load", () => {
  document.body.classList.add("loaded")
  updateGreeting()
  console.log("[v0] Page loaded and animations initialized")
})

// Update greeting every minute
setInterval(updateGreeting, 60000)


// ================================
// BLOG FILTERING
// ================================
// Function to handle blog filtering
  function initializeBlogFiltering() {
    // Get all filter tabs and blog cards
    const filterTabs = document.querySelectorAll(".filter-tab")
    const blogCards = document.querySelectorAll(".blog-card")

    // Skip if elements don't exist
    if (!filterTabs.length || !blogCards.length) {
      console.log("Filter tabs or blog cards not found")
      return
    }

    console.log("Found filter tabs:", filterTabs.length)
    console.log("Found blog cards:", blogCards.length)

    // Add click event to each filter tab
    filterTabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        // Get the filter value (blog type)
        const filterValue = this.getAttribute("data-filter")
        console.log("Filter clicked:", filterValue)

        // Remove active class from all tabs
        filterTabs.forEach((t) => t.classList.remove("active"))

        // Add active class to clicked tab
        this.classList.add("active")

        // Filter the blog cards
        blogCards.forEach((card) => {
          const cardType = card.getAttribute("data-type")
          console.log("Card type:", cardType, "comparing with filter:", filterValue)

          // If "all" is selected, show all cards
          if (filterValue === "all") {
            card.style.display = "block"
          } else {
            // Otherwise, show only cards that match the selected type
            if (cardType === filterValue) {
              card.style.display = "block"
            } else {
              card.style.display = "none"
            }
          }
        })
      })
    })

    // Trigger the "all" filter by default to ensure all properties are visible initially
    const allFilter = document.querySelector('.filter-tab[data-filter="all"]')
    if (allFilter) {
      allFilter.click()
    }
  }

  // Declare google variable
  let google


// Make sure the function is called after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // This ensures the function is called when the page loads
  initializeBlogFiltering()


  
});

// ================================
// DESTINATION FILTERING
// ================================
// Function to handle destination filtering
function initializeDestinationFiltering() {
    const filterTabs = document.querySelectorAll(".sort-country-item");
    const destinationCards = Array.from(document.querySelectorAll(".destination-card-container"));
    const paginationContainer = document.getElementById("destination-pagination");
    
    const itemsPerPage = 4;
    let currentPage = 1;
    let filteredItems = [];

    if (!filterTabs.length || !destinationCards.length) return;

    function updateDisplay() {
        // 1. Hide everything first
        destinationCards.forEach(card => card.style.display = "none");

        // 2. Calculate slice for current page
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = filteredItems.slice(start, end);

        // 3. Show only items for this page
        pageItems.forEach(card => card.style.display = "block");

        renderPagination();
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        paginationContainer.innerHTML = "";

        if (totalPages <= 1) return; // No pagination needed if only 1 page

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.classList.add("pagination-btn");
            if (i === currentPage) btn.classList.add("active");
            btn.innerText = i;
            btn.addEventListener("click", () => {
                currentPage = i;
                updateDisplay();
                document.getElementById('destinations').scrollIntoView({ behavior: 'smooth' });
            });
            paginationContainer.appendChild(btn);
        }
    }

    filterTabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            const filterValue = this.getAttribute("data-filter").toLowerCase();
            
            filterTabs.forEach((t) => t.classList.remove("active"));
            this.classList.add("active");

            // Filter logic
            if (filterValue === "all") {
                filteredItems = destinationCards;
            } else {
                filteredItems = destinationCards.filter(card => 
                    card.getAttribute("data-type") === filterValue
                );
            }

            currentPage = 1; // Reset to page 1 on new filter
            updateDisplay();
        });
    });

    // Initial load
    filteredItems = destinationCards;
    updateDisplay();
}

document.addEventListener("DOMContentLoaded", initializeDestinationFiltering);

/* ==PAYMENT SECTION FUNCTIONALITY== */

 document.addEventListener('DOMContentLoaded', function() {
            const bookingForm = document.getElementById('bookingForm');
            const paymentSection = document.getElementById('paymentSection');
            const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
            const paymentForm = document.getElementById('paymentForm');

            // Handle booking form submission
            if (bookingForm) {
                bookingForm.addEventListener('submit', function(e) {
                    
                    // Get form data
                    const formData = new FormData(bookingForm);
                    const fullName = formData.get('fullName');
                    const email = formData.get('email');
                    const phoneNumber = formData.get('phoneNumber');
                    const country = formData.get('country');
                    const travelDate = formData.get('travelDate');
                    const numberOfTravelers = formData.get('numberOfAdults');
                    
                    // Validate form
                    if (!fullName || !email || !phoneNumber || !numberOfTravelers) {
                        alert('Please fill in all required fields');
                        return;
                    }
                    
                    // Store booking data
                    const bookingData = {
                        fullName: fullName,
                        email: email,
                        phoneNumber: phoneNumber,
                        country: country,
                        travelDate: travelDate,
                        numberOfTravelers: numberOfTravelers,
                        tourPackage: 'Safari Adventure Tour',
                        totalAmount: '$' + (1990 * numberOfTravelers)
                    };
                    
                    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
                    
                    // Update payment summary
                    updatePaymentSummary(bookingData);
                    
                    // Show payment section
                    openPaymentSection();
                });
            }

            // Update payment summary
            function updatePaymentSummary(data) {
                document.getElementById('summaryPackage').textContent = data.tourPackage;
                document.getElementById('summaryTravelers').textContent = data.numberOfTravelers;
                document.getElementById('summaryDate').textContent = data.travelDate || 'Not selected';
                document.getElementById('summaryTotal').textContent = data.totalAmount;
                document.getElementById('bankAmount').textContent = data.totalAmount;
            }

            // Open payment section
            window.openPaymentSection = function() {
                paymentSection.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            };

            // Close payment section
            window.closePaymentSection = function() {
                paymentSection.style.display = 'none';
                document.body.style.overflow = 'auto';
                paymentForm.reset();
                document.querySelectorAll('.payment-form-section').forEach(section => {
                    section.style.display = 'none';
                });
            };

            // Handle payment method selection
            paymentRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    document.querySelectorAll('.payment-form-section').forEach(section => {
                        section.style.display = 'none';
                    });
                    
                    const selectedMethod = this.value;
                    
                    switch(selectedMethod) {
                        case 'stripe':
                            document.getElementById('cardPayment').style.display = 'block';
                            break;
                        case 'paypal':
                            document.getElementById('paypalPayment').style.display = 'block';
                            break;
                        case 'pesapal':
                            document.getElementById('pesapalPayment').style.display = 'block';
                            break;
                        case 'bank':
                            document.getElementById('bankPayment').style.display = 'block';
                            break;
                    }
                });
            });

            // Handle payment form submission
            if (paymentForm) {
                paymentForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
                    const bookingData = JSON.parse(sessionStorage.getItem('bookingData'));
                    
                    if (!selectedMethod) {
                        alert('Please select a payment method');
                        return;
                    }
                    
                    console.log('[v0] Payment submitted:', {method: selectedMethod, booking: bookingData});
                    
                    // Show success message
                    alert('Thank you! Your payment has been processed. You will receive a confirmation email shortly.');
                    
                    // Close and reset
                    closePaymentSection();
                    bookingForm.reset();
                });
            }

            // Close on escape key
            document.addEventListener('keydown', function(e) {
                if (paymentSection.style.display === 'flex' && e.key === 'Escape') {
                    closePaymentSection();
                }
            });

            // Close on outside click
            document.addEventListener('click', function(e) {
                if (e.target === paymentSection) {
                    closePaymentSection();
                }
            });

            // Card input formatting
            const cardInput = document.querySelector('.card-input');
            if (cardInput) {
                cardInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\s/g, '');
                    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                    e.target.value = formattedValue;
                });
            }
        });

  /* ================================
   PARTNER CAROUSEL FUNCTIONALITY
   ================================ */

let currentSlideIndex = 0;
let autoSlideTimer;

/**
 * Initialize the carousel
 */
function initPartnerCarousel() {
  console.log('[v0] Partner carousel initialized');
  startAutoSlide();
}

/**
 * Change slide by step amount
 * @param {number} step - Steps to move (1 for next, -1 for previous)
 */
function changeSlide(step) {
  console.log('[v0] Changing slide by:', step);
  clearTimeout(autoSlideTimer);
  const slides = document.querySelectorAll('.carousel-slide');
  currentSlideIndex += step;

  // Loop around
  if (currentSlideIndex >= slides.length) {
    currentSlideIndex = 0;
  } else if (currentSlideIndex < 0) {
    currentSlideIndex = slides.length - 1;
  }

  showSlide(currentSlideIndex);
  startAutoSlide(); // Restart auto-slide after manual change
}

/**
 * Go to specific slide
 * @param {number} index - Slide index to display
 */
function currentSlide(index) {
  console.log('[v0] Going to slide:', index);
  clearTimeout(autoSlideTimer);
  currentSlideIndex = index;
  showSlide(currentSlideIndex);
  startAutoSlide(); // Restart auto-slide after manual change
}

/**
 * Display the slide at given index
 * @param {number} index - Slide index to display
 */
function showSlide(index) {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');

  // Ensure index is within bounds
  if (index >= slides.length) {
    currentSlideIndex = 0;
  } else if (index < 0) {
    currentSlideIndex = slides.length - 1;
  }

  // Remove active class from all slides and dots
  slides.forEach(slide => {
    slide.classList.remove('active');
  });
  dots.forEach(dot => {
    dot.classList.remove('active');
  });

  // Add active class to current slide and dot
  slides[currentSlideIndex].classList.add('active');
  dots[currentSlideIndex].classList.add('active');

  console.log('[v0] Showing slide:', currentSlideIndex);
}

/**
 * Auto-advance slides every 4 seconds
 */
function startAutoSlide() {
  autoSlideTimer = setTimeout(() => {
    currentSlideIndex++;
    const slides = document.querySelectorAll('.carousel-slide');
    
    if (currentSlideIndex >= slides.length) {
      currentSlideIndex = 0;
    }

    showSlide(currentSlideIndex);
    startAutoSlide(); // Continue looping
  }, 4000); // Change slide every 4 seconds
}

/**
 * Pause carousel on hover
 */
function pauseCarousel() {
  console.log('[v0] Carousel paused');
  clearTimeout(autoSlideTimer);
}

/**
 * Resume carousel on mouse leave
 */
function resumeCarousel() {
  console.log('[v0] Carousel resumed');
  startAutoSlide();
}

/**
 * Add hover event listeners to pause/resume
 */
function addCarouselHoverListeners() {
  const carousel = document.querySelector('.partner-carousel-container');
  if (carousel) {
    carousel.addEventListener('mouseenter', pauseCarousel);
    carousel.addEventListener('mouseleave', resumeCarousel);
    console.log('[v0] Carousel hover listeners added');
  }
}

/**
 * Handle keyboard navigation
 */
function addKeyboardNavigation() {
  document.addEventListener('keydown', (event) => {
    const carousel = document.querySelector('.partner-carousel-container');
    // Only respond if carousel is visible/focused
    if (carousel && carousel.querySelector('.carousel-slide.active')) {
      if (event.key === 'ArrowRight') {
        changeSlide(1);
      } else if (event.key === 'ArrowLeft') {
        changeSlide(-1);
      }
    }
  });
  console.log('[v0] Keyboard navigation enabled');
}

/**
 * Initialize carousel when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPartnerCarousel();
    addCarouselHoverListeners();
    addKeyboardNavigation();
  });
} else {
  // DOM is already loaded
  initPartnerCarousel();
  addCarouselHoverListeners();
  addKeyboardNavigation();
}

