(function (window, document, $, undefined) {
  "use strict";
  if (! $) throw new Error('jquery not found');
  if (! window.ace) throw new Error('ace not found');

  var ace = window.ace,
      devURL = 'http://localhost:8888/eval/index.php',
      liveURL = 'http://phpepl.cloudcontrolled.com/eval/index.php',
      editor,

      // Format the time into a 12-hour, pretty format
      getTimeString = function () {
        var ct      = new Date(),
            hours   = ct.getHours(),
            minutes = ct.getMinutes(),
            seconds = ct.getSeconds(),
            timeString;

        // Scale the hours back
        hours = (hours > 12) ? hours - 12 : hours;

        //if 00 then it is 12 am
        hours = hours === 0 ? 12 : hours;

        timeString = [hours, minutes, seconds].join(':');

        return timeString;
      },

      // Set the html of the output div
      setOutput = function (text) {
        var isError = !! arguments[1],
            $output = $('.output span');

        // Remove error classes if any
        $output.html(text).removeClass('error');

        if (isError) {
          $output.addClass('error');
        }

        // Turn off the spinner
        $('.spinner').fadeOut('fast');
        // Set the timestamp
        $('.timestamp').find('span').html(getTimeString());
      },

      // Highlights the line in the gutter with the error
      showLineError = function (line) {
        // Find the dom element in the ace gutter
        $('.ace_gutter-cell').each(function (idx) {
          // If the cell's line number matches the error line
          if (Number($(this).html()) === line) {
            // Make the background red
            $(this).addClass('error-gutter');
            return;
          }
        });
      },

      // Helper to show the fatal errors nicely
      // Returns a list of the error text and line number that
      // generated the error.
      // FIXME: Implementation is fairly naive due to a lack of sample
      //        fatal errors to guide the parsing logic
      getPrettyFatalErrorMessage = function (responseText) {
        var text = responseText,
            tokensToReplace = ['\n', /<br \/>/g, /<b>/g,
                                /<\/b>/g, /(Fatal error: +)/g],
            splitTokens, err, line, lineNum;

        $.each(tokensToReplace, function (idx, val) {
          text = text.replace(val, "");
        });

        splitTokens = text.split('in');
        err = splitTokens[0].trim();
        splitTokens = text.split('on');
        line = splitTokens[1].trim();

        text = (err + ' on ' + line).trim();

        lineNum = line.split(" ");
        lineNum = Number(lineNum[1]);

        return [text, lineNum];
      },

      // Handles the sending of the code to the eval server
      processCode = function () {
        var code = editor.getValue();

        if (! code.length) {
          setOutput("Please supply some code...");
          return;
        }

        $('.spinner').fadeIn('fast');

        // Track it
        window._gaq.push(['_setCustomVar', 1, 'code', code]);

        // Send it for eval
        $.ajax({
          type: "POST",
          // url: devURL,
          url: liveURL,
          data: {code: code},
          dataType: 'json',
          success: function (res) {
            if (! res) return;

            var result  = res.result,
                error   = res.error,
                errorMsg;

            if (error) {
              // Show the line in red
              showLineError(error.line);
              // Show the error message
              errorMsg = "Line " + error.line + ": " + error.message;
              setOutput(errorMsg, true);
              return;
            }
            setOutput(result);
          },
          error: function (error) {
            var text_line = getPrettyFatalErrorMessage(error.responseText);
            setOutput(text_line[0], true);
            showLineError(text_line[1]);
            window._gaq.push(['_setCustomVar', 2, 'error', error.responseText]);
          }
        });
      };

  // Local storage helpers
  var
      saveCode = function () {
        if (window.localStorage) {
          var code = editor.getValue();
          localStorage.setItem('code', code);

          // Show the saved message
          $('.timestamp')
            .find('span')
              .html('Code Saved!');
        }
      },
      loadSavedCode = function () {
        // Preload where you last left off
        if (window.localStorage) {
          var result = localStorage.getItem('code'),
              code   = ! result ? 'echo "PHPepl";' : result;
          editor.setValue(code);
        }
      };

  $(function () {
    editor = ace.edit('editor');
    editor.setTheme('ace/theme/textmate');
    editor.getSession().setMode('ace/mode/php');

    loadSavedCode();

    $('.submit button').click(function () {
      processCode();
    });

    $(document).keydown(function (e) {
      // CMD + Enter or CTRL + Enter to run code
      if (e.which === 13 && (e.ctrlKey || e.metaKey)) {
        processCode();
        e.preventDefault();
      }

      // CMD + S or CTRL + S to save code
      if (e.which === 83 && (e.ctrlKey || e.metaKey)) {
        saveCode();
        e.preventDefault();
      }
    });

    // Remember the code in the editor
    // before navigating away
    $(window).unload(function () {
      saveCode();
    });
  });
})(window, document, window.jQuery);