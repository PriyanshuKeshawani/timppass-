
// Helper function for displaying/hiding error messages
function errorStatus(id, text, visibility) {
    $(`#${id}`).text(text);

    if (visibility == "hide") {
        $(`#${id}`).addClass('d-none');
    } else {
        $(`#${id}`).removeClass('d-none');
    }
}

// Function to toggle CMAT fields visibility based on Branch selection
function toggleCmatFields() {
    const branchSelect = document.getElementById("branch"); // Assuming 'branch' is the ID of your branch select
    const appearedCmatWrapper = document.getElementById("appeared_cmat_wrapper");
    const appearedCmat = document.getElementById("appeared_cmat");
    const cmatScoreWrapper = document.getElementById("cmat_score_wrapper");
    const cmatScore = document.getElementById("cmat_score");

    // Ensure elements exist before trying to access properties
    if (!branchSelect || !appearedCmatWrapper || !appearedCmat || !cmatScoreWrapper || !cmatScore) {
        console.warn("One or more CMAT related elements not found. Skipping CMAT field toggling.");
        return;
    }

    const selectedBranchValue = branchSelect.value;

    // Check if the selected branch is 'MBA' (case-insensitive for robustness)
    if (selectedBranchValue.toLowerCase() === "mba") {
        appearedCmatWrapper.style.display = "block";
        appearedCmat.setAttribute("required", "required");
        // Call toggleCmatScore to handle initial state if 'Yes' is already selected
        toggleCmatScore();
    } else {
        appearedCmatWrapper.style.display = "none";
        cmatScoreWrapper.style.display = "none"; // Also hide score if branch isn't MBA
        appearedCmat.removeAttribute("required");
        cmatScore.removeAttribute("required");
        // Reset values when hidden
        appearedCmat.value = ""; // Reset to default empty option
        cmatScore.value = "";
    }
    // Always clear CMAT errors when visibility changes
    errorStatus('appeared_cmat-error', '', 'hide');
    errorStatus('cmat_score-error', '', 'hide');
}

// Function to toggle CMAT score field based on 'appeared_cmat' selection
function toggleCmatScore() {
    const cmatValue = document.getElementById("appeared_cmat")?.value;
    const scoreWrapper = document.getElementById("cmat_score_wrapper");
    const cmatScore = document.getElementById("cmat_score");

    if (!scoreWrapper || !cmatScore) {
        console.warn("CMAT score related elements not found. Skipping score toggling.");
        return;
    }

    if (cmatValue === "Yes") {
        scoreWrapper.style.display = "block";
        cmatScore.setAttribute("required", "required");
    } else {
        scoreWrapper.style.display = "none";
        cmatScore.removeAttribute("required");
        cmatScore.value = ""; // Clear score if 'No' or '-- Select --'
    }
    errorStatus('cmat_score-error', '', 'hide'); // Clear score error on change
}


// Function to disable/enable the submit button
disable_enq_btn = (type = "disable") => {
    let submitBtn = document.getElementById('enq-send-btn');
    if (!submitBtn) return; // Exit if button not found

    if (type == "disable") {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.6";
        submitBtn.innerText = 'Wait';
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = ""; // Remove inline style
        submitBtn.innerText = 'SUBMIT';
    }
}

// Function to send admission enquiry via AJAX
sendAdmissionEnquiry = () => {
    disable_enq_btn("disable"); // Disable button before sending

    // Serialize the form data right before sending
    const formDataToSend = $("form#admission-enq-form").serialize();

    $.ajax({
        url: "send-admission-enquiry",
        type: "POST",
        data: formDataToSend,
        dataType: "JSON",
        success: (result) => {
            if (result.status == 1) {
                const msg = `Dear ${result.data.name}, Your enquiry has been sent successfully !!`;
                Swal.fire({
                    icon: 'success',
                    text: msg
                });
                // Clear all form errors after successful submission
                document.querySelectorAll(".adm-error").forEach(el => el.textContent = "");
                // Reset the form
                $('form#admission-enq-form').trigger("reset");
                // Explicitly reset dropdowns to their default disabled option
                $("#course").val("");
                $("#branch").html('<option value="" selected disabled>Select branch</option>');
                $("#state").val("");
                $("#district").html('<option value="" selected disabled>Select district</option>');

                // Hide CMAT fields after successful submission
                document.getElementById("appeared_cmat_wrapper").style.display = 'none';
                document.getElementById("cmat_score_wrapper").style.display = 'none';

            } else {
                Swal.fire({
                    icon: 'error',
                    text: result.msg
                });
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                text: 'An error occurred during submission. Please try again.'
            });
            console.error("AJAX Error: ", textStatus, errorThrown, jqXHR);
        }
    }).done(function () {
        disable_enq_btn("enable"); // Re-enable button after AJAX call completes
    });
}

// --- Form Submission Handler ---
$("#admission-enq-form").submit((e) => {
    e.preventDefault();

    // Get form element for direct access to fields
    const form = document.getElementById("admission-enq-form");

    // Get values with .trim() for all text/select inputs
    let floatingName = form.querySelector('[name="name"]').value.trim();
    let floatingCourse = form.querySelector('[name="course"]').value.trim();
    let floatingBranch = form.querySelector('[name="branch"]').value.trim();
    let floatingState = form.querySelector('[name="state"]').value.trim();
    let floatingDistrict = form.querySelector('[name="district"]').value.trim();
    let floatingContact = form.querySelector('[name="contact"]').value.trim();
    let floatingEmail = form.querySelector('[name="email"]').value.trim();
    let floatingCondition = form.querySelector('[name="condition"]').checked;

    // CMAT related values
    let floatingAppearedCmat = form.querySelector('[name="appeared_cmat"]') ? form.querySelector('[name="appeared_cmat"]').value.trim() : '';
    let floatingCmatScore = form.querySelector('[name="cmat_score"]') ? form.querySelector('[name="cmat_score"]').value.trim() : '';


    let isValidForm = true; // Overall validation flag

    // Clear all previous error messages before validation
    document.querySelectorAll(".adm-error").forEach(el => el.textContent = "");
    errorStatus('contact-error', "", 'hide');
    errorStatus('email-error', "", 'hide');

    // --- Client-side Validation Logic ---

    if (floatingName === "") {
        errorStatus('name-error', "Name is required.", 'show');
        isValidForm = false;
    }
    if (floatingCourse === "") {
        errorStatus('course-error', "Course selection is required.", 'show');
        isValidForm = false;
    }
    if (floatingBranch === "") {
        errorStatus('branch-error', "Branch selection is required.", 'show');
        isValidForm = false;
    }
    if (floatingState === "") {
        errorStatus('state-error', "State selection is required.", 'show');
        isValidForm = false;
    }
    if (floatingDistrict === "") {
        errorStatus('district-error', "District selection is required.", 'show');
        isValidForm = false;
    }
    if (floatingContact === "") {
        errorStatus('contact-error', "Contact number is required.", 'show');
        isValidForm = false;
    } else if (!/^\d{10}$/.test(floatingContact)) {
        errorStatus('contact-error', "Contact number must be 10 digits.", 'show');
        isValidForm = false;
    }

    if (floatingEmail !== "" && !/^\w+([-+.'][^\s]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(floatingEmail)) {
        errorStatus('email-error', "Enter a valid email address.", 'show');
        isValidForm = false;
    }

    if (!floatingCondition) {
        errorStatus('condition-error', "You must agree to the terms.", 'show');
        isValidForm = false;
    }

    // Conditional validation for CMAT fields (only if MBA is selected as branch)
    if (floatingBranch.toLowerCase() === "mba") {
        if (floatingAppearedCmat === "") {
            errorStatus('appeared_cmat-error', "Please select if you appeared in CMAT.", 'show');
            isValidForm = false;
        } else if (floatingAppearedCmat === "Yes" && floatingCmatScore === "") {
            errorStatus('cmat_score-error', "CMAT Score is required if you appeared.", 'show');
            isValidForm = false;
        }
    }

    // If client-side validation fails, stop here
    if (!isValidForm) {
        return;
    }

    // Disable button while performing duplicate checks
    disable_enq_btn("disable");


    // First, check for duplicate contact
    $.post("check-duplicate-admission-enquiry", {
        contact: floatingContact
    }, (response) => {
        const res = JSON.parse(response);
        if (res.status == 1 && res.data == 0) {
            errorStatus('contact-error', "", 'hide');

            // If contact is not duplicate and email is provided, check for duplicate email
            if (floatingEmail !== "") {
                $.post("check-duplicate-admission-enquiry-email", {
                    email: floatingEmail
                }, (response) => {
                    const resEmail = JSON.parse(response);
                    if (resEmail.status == 1 && resEmail.data == 0) {
                        errorStatus('email-error', "", 'hide');
                        sendAdmissionEnquiry(); // Send enquiry if both contact and email are not duplicates
                    } else if (resEmail.status == 1 && resEmail.data > 0) {
                        errorStatus('email-error', "An enquiry has already been sent with this email.", 'show');
                        disable_enq_btn("enable"); // Re-enable button
                    } else if (resEmail.status == 0) {
                        Swal.fire({
                            icon: 'error',
                            text: resEmail.msg
                        });
                        disable_enq_btn("enable"); // Re-enable button
                    }
                }).fail(function () {
                    Swal.fire({
                        icon: 'error',
                        text: 'Network error during email check. Please try again.'
                    });
                    disable_enq_btn("enable");
                });
            } else {
                // If email is not provided, send enquiry directly
                sendAdmissionEnquiry();
            }

        } else if (res.status == 1 && res.data > 0) {
            errorStatus('contact-error', "An enquiry has already been sent with this contact number.", 'show');
            errorStatus('email-error', "", 'hide'); // Clear email error if contact is primary issue
            disable_enq_btn("enable"); // Re-enable button
        } else if (res.status == 0) {
            Swal.fire({
                icon: 'error',
                text: res.msg
            });
            errorStatus('email-error', "", 'hide'); // Clear email error
            disable_enq_btn("enable"); // Re-enable button
        }
    }).fail(function () {
        Swal.fire({
            icon: 'error',
            text: 'Network error during contact check. Please try again.'
        });
        disable_enq_btn("enable"); // Re-enable button on AJAX fail
    });
});

// Event listener for course change to populate branches
// This is the key change: ensure you target the correct course select element by its ID
$(document).on("change", "#course", function () { // Assuming your course select has id="course"
    const courseName = $(this).val();

    // Make an AJAX call to get branches based on the selected course
    $.get("get-branch-on-course-name", { // Ensure this endpoint is correct
        course_name: courseName
    }, (res) => {
        // Populate the branch dropdown. The HTML should contain options, e.g., <option value="MBA">MBA</option>
        $("#branch").html(res);
        // After branches are loaded, evaluate CMAT fields visibility
        toggleCmatFields();
    });
});

// Event listener for branch change to toggle CMAT fields
$(document).on("change", "#branch", function () {
    toggleCmatFields();
});

// Event listener for 'Appeared in CMAT?' change
$(document).on("change", "#appeared_cmat", function () {
    toggleCmatScore();
});

// Event listener for state change to populate districts
$(document).on("change", ".get-city-on-state-change", function () {
    const state_id = $('option:selected', this).attr('data-id');
    $.get("get-city-on-state", {
        state_id: state_id
    }, (res) => {
        $(".change-city-options-on-state").html(res);
    });
});

// Other existing event listeners for popup text
$(document).on("click", ".popup-text", function (e) {
    e.preventDefault();
    const popupText = $(this).attr("popup-text");
    Swal.fire({
        icon: '',
        text: popupText
    });
});

// Initial calls on page load
$(document).ready(function () {
    // Ensure CMAT fields visibility is correctly set on initial page load
    // This is important if a form is pre-filled or if the page is loaded with a default course/branch
    toggleCmatFields();
});
