jQuery(document).ready(function ($) {
  const { jsPDF } = window.jspdf;

  // Default values
  var defaultValues = { 
    customerConversations: 120000,
    agentSalary: 50000,
    numberOfAgents: 50,
    resolutionTime: 8, 
    growthRate: 10,
    automationRate: 90
  };

  // Initialize growth rate input (changed from slider to number input)
  var growthInput = $('.rt__inputdiv.growthrate input[type="number"]');
  if (growthInput.length > 0) {
    growthInput.val(defaultValues.growthRate);
    
    growthInput.on('input', function () {
      calculateROI();
    });
  }

  // Initialize automation rate slider
  var automationSliders = $('.rt__input--tar .tar__slider');
  if (automationSliders.length > 0) {
    var automationSlider = automationSliders[0];
    automationSlider.min = 50;
    automationSlider.max = 90;
    automationSlider.value = defaultValues.automationRate;
    var value = Math.floor(automationSlider.value);
    var percentage = ((value - 50) / (90 - 50)) * 100;
    $('.tar__slider--line').width(percentage + '%');
    $('#tar-value').text(value + '%');
    automationSlider.oninput = function () {
      var value = Math.floor(this.value);
      var percentage = ((value - 50) / (90 - 50)) * 100;
      $('.tar__slider--line').width(percentage + '%');
      $('#tar-value').text(value + '%');
      calculateROI();
    };
  }

  // Set default values in input fields
  $('.rt__inputdiv input[type="number"]').each(function(index) {
    var defaultVal = Object.values(defaultValues)[index];
    if (defaultVal !== undefined) {
      $(this).val(defaultVal);
    }
  });

  // Add event listeners to input fields
  $('.rt__inputdiv input[type="number"]').on('input', function() {
    calculateROI();
  });

  // Utility functions
  function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  }

  function formatCurrency(num) {
    return new Intl.NumberFormat('en-US').format(Math.round(num)); 
  }
  function formatCurrencyPrint(num) {
    return '$' + new Intl.NumberFormat('en-US').format(Math.round(num));
  }

  function calculateROI() {
    // Get input values - FIXED: Get growth rate from number input instead of slider
    var MT = parseFloat($('.rt__inputdiv input[type="number"]').eq(0).val()) || defaultValues.customerConversations;
    var AS = parseFloat($('.rt__inputdiv input[type="number"]').eq(1).val()) || defaultValues.agentSalary;
    var NA = parseFloat($('.rt__inputdiv input[type="number"]').eq(2).val()) || defaultValues.numberOfAgents;
    var ART = parseFloat($('.rt__inputdiv input[type="number"]').eq(3).val()) || defaultValues.resolutionTime;
    var YoY_input = parseFloat($('.rt__inputdiv.growthrate input[type="number"]').val()) || defaultValues.growthRate;
    
    // Get slider values
    var YoY = YoY_input / 100; // Convert percentage to decimal
    var AR = parseFloat($('.tar__slider').val()) / 100 || (defaultValues.automationRate / 100);

    // Core calculations - FIXED: Include number of agents in savings calculation
    var automatedTickets = MT * AR;
    var hoursSaved = (automatedTickets * ART) / 60;
    var hoursSavedMonthly = hoursSaved / 12;
    var newAvgResolutionTime = ART * (1 - AR);
    var resolutionImprovement = ((ART - newAvgResolutionTime) / ART) * 100;
    var agentEquivalentReduction = hoursSaved / (40 * 52);
    
    // FIXED: Year 1 savings should be based on agent equivalent reduction AND salary
    var year1Savings = agentEquivalentReduction * AS;
    
    // Calculate 5-year savings with growth
    var year2Savings = year1Savings * (1 + YoY);
    var year3Savings = year2Savings * (1 + YoY);
    var year4Savings = year3Savings * (1 + YoY);
    var year5Savings = year4Savings * (1 + YoY);
    var total5YearSavings = year1Savings + year2Savings + year3Savings + year4Savings + year5Savings;
    
    // Monthly savings
    var monthlySavings = total5YearSavings / 60;
    
    // FIXED: ROI calculation - implementation cost should be reasonable
    var implementationCost = year1Savings * 0.29; // 29% of first year savings as implementation cost
    var roi = (year1Savings / implementationCost) * 100;
    
    // FIXED: Payback calculation in months
    var paybackMonths = (implementationCost / (year1Savings / 12));
    
    // Payroll percentage
    var totalPayroll = NA * AS;
    var payrollPercentage = (year1Savings / totalPayroll) * 100;
    
    // Time reduction percentage
    var totalHours = NA * 40 * 52;
    var timeReductionPercentage = (hoursSaved / totalHours) * 100;

    // Update the UI
    updateResults({
      total5YearSavings: total5YearSavings,
      monthlySavings: monthlySavings,
      year1Savings: year1Savings,
      year2Savings: year2Savings,
      year3Savings: year3Savings,
      year4Savings: year4Savings,
      year5Savings: year5Savings,
      growthRate: YoY * 100,
      averageAnnualSavings: total5YearSavings / 5,
      payrollPercentage: payrollPercentage,
      hoursSaved: hoursSaved,
      timeReductionPercentage: timeReductionPercentage,
      automatedTickets: automatedTickets,
      automationRate: AR * 100,
      agentEquivalentReduction: agentEquivalentReduction,
      roi: roi,
      resolutionImprovement: resolutionImprovement,
      newAvgResolutionTime: newAvgResolutionTime,
      hoursSavedMonthly: hoursSavedMonthly,
      paybackMonths: paybackMonths
    });
  }

  function updateResults(results) {
    // Total 5-year savings
    $('.rtt__price').text(formatCurrency(results.total5YearSavings));
    $('.rtt__totalsaving').text(formatCurrency(results.monthlySavings)); 
    
    // Four main columns
    var columns = $('.rt__column');
    
    // Year 1 Savings
    columns.eq(0).find('.rtc__title').text(formatCurrency(results.year1Savings));
    columns.eq(0).find('.rtc__para').text(results.payrollPercentage.toFixed(1));
    
    // Hours Saved/Year
    columns.eq(1).find('.rtc__title').text(formatNumber(results.hoursSaved));
    columns.eq(1).find('.rtc__para').text(results.timeReductionPercentage.toFixed(1));
    
    // Automated Tickets
    columns.eq(2).find('.rtc__title').text(formatNumber(results.automatedTickets));
    columns.eq(2).find('.rtc__para').text(results.automationRate.toFixed(0));
    
    // Agents Reassigned
    columns.eq(3).find('.rtc__title').text(results.agentEquivalentReduction.toFixed(1));
    
    // ROI and Payback - FIXED: Now using calculated values
    var estimated = $('.rte__single');
    estimated.eq(0).find('.rte__title').text(Math.round(results.roi) + '%');
    
    // FIXED: Use calculated payback period
    if (results.paybackMonths <= 6) {
      estimated.eq(1).find('.rte__title').text(Math.ceil(results.paybackMonths) + ' months');
    } else if (results.paybackMonths <= 12) {
      estimated.eq(1).find('.rte__title').text(Math.ceil(results.paybackMonths) + ' months');
    } else {
      estimated.eq(1).find('.rte__title').text('12+ months');
    }
    
    // Efficiency Improvements
    var improvements = $('.rti__single');
    improvements.eq(0).find('.rti__value').text(results.resolutionImprovement.toFixed(1) + '%');
    improvements.eq(1).find('.rti__value').text(results.newAvgResolutionTime.toFixed(1) + ' minutes');
    improvements.eq(2).find('.rti__value').text(formatNumber(results.hoursSavedMonthly) + ' hours');

    // Update Year-by-Year Breakdown
    updateYearByYearBreakdown(results);
  }

  function updateYearByYearBreakdown(results) {
    var yearSavings = [
      results.year1Savings,
      results.year2Savings,
      results.year3Savings,
      results.year4Savings,
      results.year5Savings
    ];
    
    // Find the maximum value for progress bar scaling
    var maxSavings = Math.max.apply(Math, yearSavings);
    
    // Update each year's breakdown
    var breakdownItems = $('.rbwb__single');
    
    breakdownItems.each(function(index) {
      if (index < 5) {
        var currentSavings = yearSavings[index];
        var progressPercentage = (currentSavings / maxSavings) * 100;
        
        // Update price
        $(this).find('.rbwb__price').text(formatCurrency(currentSavings));
        
        // Update growth increment (except for year 1)
        if (index > 0) {
          $(this).find('.rbwb__year--increment').text('+' + results.growthRate.toFixed(1) + '%');
        }
        
        // Update progress bar width
        $(this).find('.rbwb__line--progress').css('width', progressPercentage + '%');
      }
    });
    
    // Update total section
    $('.rbwbtl__average').text('Average annual savings: ' + formatCurrency(results.averageAnnualSavings));
    $('.rbwbt__right').text(formatCurrency(results.total5YearSavings));

    // Update chart
    updateChart(yearSavings);
  }

  // Chart variables
  var canvas = null;
  var ctx = null;

  function initializeChart() {
    canvas = document.getElementById('roi-savings-chart');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    
    // Initial draw with default data
    drawChart([0, 0, 0, 0, 0]);
  }

  function drawChart(yearSavings) {
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Setup
    var padding = 60;
    var chartWidth = canvas.width - 2 * padding;
    var chartHeight = canvas.height - 2 * padding;
    
    // Find max value and set scale
    var maxValue = Math.max.apply(Math, yearSavings);
    var minValue = 0;
    
    // Round up max value to nice numbers
    var roundedMax;
    if (maxValue <= 100000) {
      roundedMax = Math.ceil(maxValue / 10000) * 10000;
    } else if (maxValue <= 500000) {
      roundedMax = Math.ceil(maxValue / 25000) * 25000;
    } else if (maxValue <= 1000000) {
      roundedMax = Math.ceil(maxValue / 50000) * 50000;
    } else {
      roundedMax = Math.ceil(maxValue / 100000) * 100000;
    }
    
    var paddedRange = roundedMax - minValue;
    
    // Calculate points
    var points = [];
    for (var i = 0; i < yearSavings.length; i++) {
      var x = padding + (i / (yearSavings.length - 1)) * chartWidth;
      var y = padding + chartHeight - ((yearSavings[i] - minValue) / paddedRange) * chartHeight;
      points.push({x: x, y: y, value: yearSavings[i]});
    }
    
    // Create gradient
    var gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, '#F2CB67');
    gradient.addColorStop(1, 'rgba(92, 66, 252, 0.05)');
    
    // Draw area fill
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding + chartHeight);
    for (var i = 0; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, padding + chartHeight);
    ctx.closePath();
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = '#F2CB67';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    // Draw axis borders
    ctx.strokeStyle = '#4D477B';
    ctx.lineWidth = 1;
    
    // X-axis (bottom border)
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();
    
    // Y-axis (left border)
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels
    var labels = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
    for (var i = 0; i < labels.length; i++) {
      var x = padding + (i / (labels.length - 1)) * chartWidth;
      ctx.fillText(labels[i], x, canvas.height - 20);
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (var i = 0; i <= 5; i++) {
      var value = minValue + (paddedRange * (5 - i) / 5);
      var y = padding + (i / 5) * chartHeight;
      var label = '$' + Math.round(value / 1000) + 'K';
      ctx.fillText(label, padding - 10, y + 4);
    }
  }

  function updateChart(yearSavings) {
    drawChart(yearSavings);
  }

  // Initialize chart after page load
  setTimeout(function() {
    initializeChart();
    calculateROI();
  }, 100);


  // Add this to your existing JavaScript code in block-roi-v2.js

  // Function to update print section with current data
  function updatePrintSection(results, inputValues) {
    // Update client input values 
    $('.ps__clientvalue1').text(formatNumber(inputValues.customerConversations));
    $('.ps__clientvalue2').text(formatCurrencyPrint(inputValues.agentSalary).replace('$', ''));
    $('.ps__clientvalue3').text(formatNumber(inputValues.numberOfAgents));
    $('.ps__clientvalue4').text(inputValues.resolutionTime);
    $('.ps__clientvalue5').text(inputValues.growthRate.toFixed(0) + '%');
    $('.ps__clientvalue6').text(inputValues.automationRate.toFixed(0) + '%');

    // Update total savings
    $('.ps__totalsaving').text(formatCurrencyPrint(results.total5YearSavings));
    $('.ps__totalsavingmonth').text('That\'s ' + formatCurrencyPrint(results.monthlySavings) + ' saved every month!');

    // Update saving details
    $('.ps__savingdetailstitle1').text(formatCurrencyPrint(results.year1Savings));
    $('.ps__savingdetailssubtitle1').text(results.payrollPercentage.toFixed(1) + '% of payroll');
    $('.ps__savingdetailstitle2').text(formatNumber(results.hoursSaved));
    $('.ps__savingdetailssubtitle2').text(results.timeReductionPercentage.toFixed(1) + '% time reduction');
    $('.ps__savingdetailstitle3').text(formatNumber(results.automatedTickets));
    $('.ps__savingdetailssubtitle3').text(results.automationRate.toFixed(0) + '% automation rate');
    $('.ps__savingdetailstitle4').text(results.agentEquivalentReduction.toFixed(1));

    // Update estimations
    $('.ps__estimation1').text(Math.round(results.roi) + '%');
    
    // Calculate payback period - FIXED: Use the calculated payback period
    if (results.paybackMonths <= 6) {
      $('.ps__estimation2').text(Math.ceil(results.paybackMonths) + ' months');
    } else if (results.paybackMonths <= 12) {
      $('.ps__estimation2').text(Math.ceil(results.paybackMonths) + ' months');
    } else {
      $('.ps__estimation2').text('12+ months');
    }

    // Update efficiency improvements
    $('.ps__efficiency1').text(results.resolutionImprovement.toFixed(1) + '%');
    $('.ps__efficiency2').text(results.newAvgResolutionTime.toFixed(1) + ' minutes');
    $('.ps__efficiency3').text(formatNumber(results.hoursSavedMonthly) + ' hours');

    // Update year by year breakdown
    $('.ps__year1').text(formatCurrencyPrint(results.year1Savings));
    $('.ps__year2').text(formatCurrencyPrint(results.year2Savings));
    $('.ps__year3').text(formatCurrencyPrint(results.year3Savings));
    $('.ps__year4').text(formatCurrencyPrint(results.year4Savings));
    $('.ps__year5').text(formatCurrencyPrint(results.year5Savings));

    // Update growth percentages
    $('.ps__yeargrowth2').text('+' + results.growthRate.toFixed(1) + '%');
    $('.ps__yeargrowth3').text('+' + results.growthRate.toFixed(1) + '%');
    $('.ps__yeargrowth4').text('+' + results.growthRate.toFixed(1) + '%');
    $('.ps__yeargrowth5').text('+' + results.growthRate.toFixed(1) + '%');

    // Update totals
    $('.ps__yeartotal').text(formatCurrencyPrint(results.total5YearSavings));
    $('.ps__yearaverage').text('Average annual savings: ' + formatCurrencyPrint(results.averageAnnualSavings));
  }

  // Function to generate and download PDF
  function downloadROIPDF() {
    // Get current input values - FIXED: Get growth rate from number input
    var inputValues = {
      customerConversations: parseFloat($('.rt__inputdiv input[type="number"]').eq(0).val()) || defaultValues.customerConversations,
      agentSalary: parseFloat($('.rt__inputdiv input[type="number"]').eq(1).val()) || defaultValues.agentSalary,
      numberOfAgents: parseFloat($('.rt__inputdiv input[type="number"]').eq(2).val()) || defaultValues.numberOfAgents,
      resolutionTime: parseFloat($('.rt__inputdiv input[type="number"]').eq(3).val()) || defaultValues.resolutionTime,
      growthRate: parseFloat($('.rt__inputdiv.growthrate input[type="number"]').val()) || defaultValues.growthRate, // FIXED: Get from number input
      automationRate: parseFloat($('.tar__slider').val()) || defaultValues.automationRate
    };

    // Calculate results - FIXED: Use same logic as main calculator
    var MT = inputValues.customerConversations;
    var AS = inputValues.agentSalary;
    var NA = inputValues.numberOfAgents;
    var ART = inputValues.resolutionTime;
    var YoY = inputValues.growthRate / 100; // FIXED: Convert to decimal
    var AR = inputValues.automationRate / 100;

    // Core calculations - SAME AS MAIN CALCULATOR
    var automatedTickets = MT * AR;
    var hoursSaved = (automatedTickets * ART) / 60;
    var hoursSavedMonthly = hoursSaved / 12;
    var newAvgResolutionTime = ART * (1 - AR);
    var resolutionImprovement = ((ART - newAvgResolutionTime) / ART) * 100;
    var agentEquivalentReduction = hoursSaved / (40 * 52);
    var year1Savings = agentEquivalentReduction * AS;
    
    // Calculate 5-year savings with growth
    var year2Savings = year1Savings * (1 + YoY);
    var year3Savings = year2Savings * (1 + YoY);
    var year4Savings = year3Savings * (1 + YoY);
    var year5Savings = year4Savings * (1 + YoY);
    var total5YearSavings = year1Savings + year2Savings + year3Savings + year4Savings + year5Savings;
    
    // Monthly savings
    var monthlySavings = total5YearSavings / 60;
    
    // FIXED: ROI calculation - same as main calculator
    var implementationCost = year1Savings * 0.29;
    var roi = (year1Savings / implementationCost) * 100;
    
    // FIXED: Payback calculation
    var paybackMonths = (implementationCost / (year1Savings / 12));
    
    // Payroll percentage
    var totalPayroll = NA * AS;
    var payrollPercentage = (year1Savings / totalPayroll) * 100;
    
    // Time reduction percentage
    var totalHours = NA * 40 * 52;
    var timeReductionPercentage = (hoursSaved / totalHours) * 100;

    var results = {
      total5YearSavings: total5YearSavings,
      monthlySavings: monthlySavings,
      year1Savings: year1Savings,
      year2Savings: year2Savings,
      year3Savings: year3Savings,
      year4Savings: year4Savings,
      year5Savings: year5Savings,
      growthRate: YoY * 100,
      averageAnnualSavings: total5YearSavings / 5,
      payrollPercentage: payrollPercentage,
      hoursSaved: hoursSaved,
      timeReductionPercentage: timeReductionPercentage,
      automatedTickets: automatedTickets,
      automationRate: AR * 100,
      agentEquivalentReduction: agentEquivalentReduction,
      roi: roi,
      resolutionImprovement: resolutionImprovement,
      newAvgResolutionTime: newAvgResolutionTime,
      hoursSavedMonthly: hoursSavedMonthly,
      paybackMonths: paybackMonths // ADDED: Include payback months
    };

    // Create year savings array for chart
    var yearSavings = [
      results.year1Savings,
      results.year2Savings,
      results.year3Savings,
      results.year4Savings,
      results.year5Savings
    ];

    // Update print section with current data and chart
    updatePrintSectionWithChart(results, inputValues, yearSavings);

    // Show loading indicator
    var loadingIndicator = $('<div id="pdf-loading" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; font-size: 16px;">Generating PDF...</div>');
    $('body').append(loadingIndicator);

    // Position print section off-screen but visible for capture
    var printSection = $('.printsection');
    printSection.css({
      'position': 'fixed',
      'top': '-10000px',
      'left': '0',
      'width': '1440px',
      'height': 'auto',
      'z-index': '9999',
      'background': 'white',
      'visibility': 'visible',
      'opacity': '1',
      'transform': 'scale(1)'
    });

    // Wait a moment for the DOM and chart to update, then capture
    setTimeout(function() {
      var actualHeight = printSection[0].scrollHeight;
      
      html2canvas(printSection[0], {
        width: 1440,
        height: actualHeight,
        scale: 0.8,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true
      }).then(function(canvas) {
        // Hide the print section again
        printSection.css({
          'position': 'absolute',
          'top': '0',
          'left': '50%',
          'transform': 'translate(-50%, 0)',
          'visibility': 'hidden',
          'opacity': '0',
          'z-index': '999'
        });

        // Remove loading indicator
        loadingIndicator.remove();

        // Create PDF with proper sizing
        var imgData = canvas.toDataURL('image/png', 0.95);
        var pdf = new jsPDF('p', 'mm', 'a4');
        
        var pdfWidth = pdf.internal.pageSize.getWidth();
        var pdfHeight = pdf.internal.pageSize.getHeight();
        
        var imgWidth = pdfWidth;
        var imgHeight = (canvas.height * pdfWidth) / canvas.width;
        var totalImageHeight = imgHeight;

        var position = 0;
        var heightLeft = imgHeight;
        var pageNumber = 1;

        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Add clickable overlays
        addClickableAreasToPage(pdf, pageNumber, pdfWidth, pdfHeight, totalImageHeight, position);
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pageNumber++;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          // Add clickable areas to this page
          addClickableAreasToPage(pdf, pageNumber, pdfWidth, pdfHeight, totalImageHeight, position); 

          heightLeft -= pdfHeight;
        }

        var companyName = 'ROI-Analysis';
        var filename = companyName + '-' + new Date().toISOString().split('T')[0] + '.pdf';
        pdf.save(filename);
        
      }).catch(function(error) {
        console.error('Error generating PDF:', error);
        alert('There was an error generating the PDF. Please try again.');
        
        printSection.css({
          'position': 'absolute',
          'top': '0',
          'left': '50%',
          'transform': 'translate(-50%, 0)',
          'visibility': 'hidden',
          'opacity': '0',
          'z-index': '999'
        });
        loadingIndicator.remove();
      });
    }, 300); // Longer delay to ensure chart is rendered
  }

  // // Add event listener for download button
  // $(document).on('click', '#download-roi-pdf', function(e) {
  //   e.preventDefault();
  //   downloadROIPDF();
  // });

  // // Also add event listener for any download button with class
  // $(document).on('click', '.download-roi-btn', function(e) {
  //   e.preventDefault();
  //   downloadROIPDF();
  // });

  // Helper function to get current input values - UPDATED
  function getCurrentInputValues() {
    return {
      customerConversations: parseFloat($('.rt__inputdiv input[type="number"]').eq(0).val()) || defaultValues.customerConversations,
      agentSalary: parseFloat($('.rt__inputdiv input[type="number"]').eq(1).val()) || defaultValues.agentSalary,
      numberOfAgents: parseFloat($('.rt__inputdiv input[type="number"]').eq(2).val()) || defaultValues.numberOfAgents,
      resolutionTime: parseFloat($('.rt__inputdiv input[type="number"]').eq(3).val()) || defaultValues.resolutionTime,
      growthRate: parseFloat($('.rt__inputdiv.growthrate input[type="number"]').val()) || defaultValues.growthRate, // FIXED
      automationRate: parseFloat($('.tar__slider').val()) || defaultValues.automationRate
    };
  }

  // Print section chart variables
  var printCanvas = null;
  var printCtx = null;

  function initializePrintChart() {
    printCanvas = document.getElementById('ps-savings-chart');
    if (!printCanvas) return;
    
    printCtx = printCanvas.getContext('2d');
  }

  function drawPrintChart(yearSavings) {
    if (!printCtx || !printCanvas) return;
    
    // Clear canvas
    printCtx.clearRect(0, 0, printCanvas.width, printCanvas.height);
    
    // Setup
    var padding = 60;
    var chartWidth = printCanvas.width - 2 * padding;
    var chartHeight = printCanvas.height - 2 * padding;
    
    // Find max value and set scale
    var maxValue = Math.max.apply(Math, yearSavings);
    var minValue = 0;
    
    // Round up max value to nice numbers
    var roundedMax;
    if (maxValue <= 100000) {
      roundedMax = Math.ceil(maxValue / 10000) * 10000;
    } else if (maxValue <= 500000) {
      roundedMax = Math.ceil(maxValue / 25000) * 25000;
    } else if (maxValue <= 1000000) {
      roundedMax = Math.ceil(maxValue / 50000) * 50000;
    } else {
      roundedMax = Math.ceil(maxValue / 100000) * 100000;
    }
    
    var paddedRange = roundedMax - minValue;
    
    // Calculate points
    var points = [];
    for (var i = 0; i < yearSavings.length; i++) {
      var x = padding + (i / (yearSavings.length - 1)) * chartWidth;
      var y = padding + chartHeight - ((yearSavings[i] - minValue) / paddedRange) * chartHeight;
      points.push({x: x, y: y, value: yearSavings[i]});
    }
    
    // Create gradient for print version with specified colors
    var gradient = printCtx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, '#29165E'); // Top color
    gradient.addColorStop(1, 'rgba(92, 66, 252, 0.05)'); // Bottom color with transparency
    
    // Draw area fill
    printCtx.fillStyle = gradient;
    printCtx.beginPath();
    printCtx.moveTo(points[0].x, padding + chartHeight);
    for (var i = 0; i < points.length; i++) {
      printCtx.lineTo(points[i].x, points[i].y);
    }
    printCtx.lineTo(points[points.length - 1].x, padding + chartHeight);
    printCtx.closePath();
    printCtx.fill();
    
    // Draw line with specified color
    printCtx.strokeStyle = '#5C42FC';
    printCtx.lineWidth = 3;
    printCtx.beginPath();
    printCtx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      printCtx.lineTo(points[i].x, points[i].y);
    }
    printCtx.stroke();
    
    // Draw axis borders with specified color
    printCtx.strokeStyle = '#4D477B';
    printCtx.lineWidth = 1;
    
    // X-axis (bottom border)
    printCtx.beginPath();
    printCtx.moveTo(padding, padding + chartHeight);
    printCtx.lineTo(padding + chartWidth, padding + chartHeight);
    printCtx.stroke();
    
    // Y-axis (left border)
    printCtx.beginPath();
    printCtx.moveTo(padding, padding);
    printCtx.lineTo(padding, padding + chartHeight);
    printCtx.stroke();
    
    // Draw labels with black color
    printCtx.fillStyle = '#000000';
    printCtx.font = '12px Arial';
    printCtx.textAlign = 'center';
    
    // X-axis labels
    var labels = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
    for (var i = 0; i < labels.length; i++) {
      var x = padding + (i / (labels.length - 1)) * chartWidth;
      printCtx.fillText(labels[i], x, printCanvas.height - 20);
    }
    
    // Y-axis labels
    printCtx.textAlign = 'right';
    for (var i = 0; i <= 5; i++) {
      var value = minValue + (paddedRange * (5 - i) / 5);
      var y = padding + (i / 5) * chartHeight;
      var label = '$' + Math.round(value / 1000) + 'K';
      printCtx.fillText(label, padding - 10, y + 4);
    }
  }

  // Update the updatePrintSectionWithChart function to include payback period fix
  function updatePrintSectionWithChart(results, inputValues, yearSavings) {
    // Update all the existing text elements
    $('.ps__clientvalue1').text(formatNumber(inputValues.customerConversations));
    $('.ps__clientvalue2').text(formatCurrencyPrint(inputValues.agentSalary).replace('$', ''));
    $('.ps__clientvalue3').text(formatNumber(inputValues.numberOfAgents));
    $('.ps__clientvalue4').text(inputValues.resolutionTime);
    $('.ps__clientvalue5').text(inputValues.growthRate.toFixed(0) + '%');
    $('.ps__clientvalue6').text(inputValues.automationRate.toFixed(0) + '%');

    // Update total savings
    $('.ps__totalsaving').text(formatCurrencyPrint(results.total5YearSavings));
    $('.ps__totalsavingmonth').text('That\'s ' + formatCurrencyPrint(results.monthlySavings) + ' saved every month!');

    // Update saving details
    $('.ps__savingdetailstitle1').text(formatCurrencyPrint(results.year1Savings));
    $('.ps__savingdetailssubtitle1').text(results.payrollPercentage.toFixed(1) + '% of payroll');
    $('.ps__savingdetailstitle2').text(formatNumber(results.hoursSaved));
    $('.ps__savingdetailssubtitle2').text(results.timeReductionPercentage.toFixed(1) + '% time reduction');
    $('.ps__savingdetailstitle3').text(formatNumber(results.automatedTickets));
    $('.ps__savingdetailssubtitle3').text(results.automationRate.toFixed(0) + '% automation rate');
    $('.ps__savingdetailstitle4').text(results.agentEquivalentReduction.toFixed(1));

    // Update estimations - FIXED: Use calculated values
    $('.ps__estimation1').text(Math.round(results.roi) + '%');
    
    // FIXED: Use calculated payback period
    if (results.paybackMonths <= 6) {
      $('.ps__estimation2').text(Math.ceil(results.paybackMonths) + ' months');
    } else if (results.paybackMonths <= 12) {
      $('.ps__estimation2').text(Math.ceil(results.paybackMonths) + ' months');
    } else {
      $('.ps__estimation2').text('12+ months');
    }

    // Update efficiency improvements
    $('.ps__efficiency1').text(results.resolutionImprovement.toFixed(1) + '%');
    $('.ps__efficiency2').text(results.newAvgResolutionTime.toFixed(1) + ' minutes');
    $('.ps__efficiency3').text(formatNumber(results.hoursSavedMonthly) + ' hours');

    // Update year by year breakdown
    $('.ps__year1').text(formatCurrencyPrint(results.year1Savings));
    $('.ps__year2').text(formatCurrencyPrint(results.year2Savings));
    $('.ps__year3').text(formatCurrencyPrint(results.year3Savings));
    $('.ps__year4').text(formatCurrencyPrint(results.year4Savings));
    $('.ps__year5').text(formatCurrencyPrint(results.year5Savings));

    // Update growth percentages
    $('.ps__yeargrowth2').text('+' + results.growthRate.toFixed(1) + '%');
    $('.ps__yeargrowth3').text('+' + results.growthRate.toFixed(1) + '%');
    $('.ps__yeargrowth4').text('+' + results.growthRate.toFixed(1) + '%');
    $('.ps__yeargrowth5').text('+' + results.growthRate.toFixed(1) + '%');

    // Update totals
    $('.ps__yeartotal').text(formatCurrencyPrint(results.total5YearSavings));
    $('.ps__yearaverage').text('Average annual savings: ' + formatCurrencyPrint(results.averageAnnualSavings));

    // Update the print chart
    drawPrintChart(yearSavings);
  }

  // Initialize print chart on page load (add this to your document ready function)
  // Also add this line to your existing setTimeout function:
  setTimeout(function() {
    initializeChart();
    initializePrintChart(); // Add this line
    calculateROI();
  }, 100);

  // Function to add invisible clickable areas over your PDF image
  function addClickableAreasToPage(pdf, pageNumber, pdfWidth, pdfHeight, totalImageHeight, imagePosition) {
    var scale = pdfWidth / 1440;
    
    // Define all your clickable areas with their original positions
    var allClickableAreas = [
      {
        name: 'book-a-demo',
        x: 603, y: 1952, width: 235, height: 56,
        url: 'https://yellow.ai/request-demo/?utm_source=roi_report&utm_medium=referral&utm_campaign=ROI_Calculator_Sept_2025',  
        originalY: 1952 
      },
      {
        name: 'book-a-demo-2',
        x: 215, y: 3789, width: 160, height: 47,
        url: 'https://yellow.ai/request-demo/?utm_source=roi_report&utm_medium=referral&utm_campaign=ROI_Calculator_Sept_2025',
        originalY: 3789
      },
      {
        name: 'website-link',
        x: 501, y: 3974, width: 160, height: 24,
        url: 'https://yellow.ai/',
        originalY: 3974
      },
      {
        name: 'contact-us',
        x: 736, y: 3974, width: 203, height: 24,
        url: 'mailto:contact@yellow.ai',
        originalY: 3974 
      }
    ];
    
    // Calculate which elements should appear on this page
    var pageStartY = (pageNumber - 1) * (pdfHeight / scale);
    var pageEndY = pageNumber * (pdfHeight / scale);
    
    // Add clickable areas that fall within this page
    allClickableAreas.forEach(function(area) {
      var elementTop = area.originalY;
      var elementBottom = area.originalY + area.height;
      
      // Check if this element appears on current page
      if (elementBottom > pageStartY && elementTop < pageEndY) {
        // Calculate the adjusted Y position for this page
        var adjustedY = (area.originalY - pageStartY) * scale;
        
        // Make sure the clickable area is within page bounds
        if (adjustedY >= 0 && adjustedY < pdfHeight) {
          pdf.link(
            area.x * scale,
            adjustedY,
            area.width * scale,
            area.height * scale,
            {url: area.url}
          );
          
          console.log('Added clickable area "' + area.name + '" to page ' + pageNumber + ' at Y=' + adjustedY);
        }
      }
    }); 
  }
  window.downloadROIPDF = downloadROIPDF;
});