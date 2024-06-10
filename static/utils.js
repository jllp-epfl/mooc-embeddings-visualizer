let result_html = ""
let course_title = ""
let idx = -1
let prev_idx_marker = -1
let current_idx_marker = -1
let current_idx_marker_name = ""
let current_idx_marker_course_name = ""
let prev_idx_marker_name = ""
// let subdomain = "/mooc-embeddings-visu"
let subdomain = ""

let all_courses_loaded = false


function clear_metadata_content_fields() {
    $("#metadata").empty()
    $("#transcript_or_quiz").empty()
  }

function update_tree(course_title, filename) {
    $.getJSON({
        url: subdomain + "/callback_transcript_or_quiz_and_metadata",
        data: { course_title: course_title, filename: filename },
        mode: 'cors',
        success: function (result) {
        $("#metadata").empty()
        $("#metadata").innerHTML = ""
        let type_of_node = result["context"]["type"]

        type_of_oed = ""
        title = ""
        url = ""
        content_panel_title = ""
        metadata_panel_title = ""
        content = ""
        course_title_with_spaces = result["context"]["course_title"]
        course_id = result["context"]["course_id"]
        course_run = result["context"]["course_run"]
        chapter_title = result["context"]["chapter_title"]
        chapter_order_in_course = result["context"]["chapter_order_in_course"]
        sequential_title = result["context"]["sequential_title"]
        sequential_order_in_chapter = result["context"]["sequential_order_in_chapter"]
        vertical_title = result["context"]["vertical_title"]
        vertical_order_in_sequential = result["context"]["vertical_order_in_sequential"]

        if (type_of_node == 1) {
            // video
            type_of_oed = "Video lecture"
            title = result["context"]["video_title"]
            url = result["context"]["video_url"]
            xml_filename = result["context"]["video_filename"]
            content_panel_title = "Video Lecture Transcript"
            metadata_panel_title = "Metadata"
            content = result["context"]["transcript_all_text"]
            content = content.replace(/\n\s*\n/g, "\n")
        } else {
            // quiz
            type_of_oed = "Quiz"
            title = result["context"]["quiz_title"]
            url = result["context"]["quiz_url_name"]
            xml_filename = result["context"]["quiz_filename"]
            content_panel_title = "Quiz Content"
            metadata_panel_title = "Metadata"
            content = result["context"]["quiz_all_text_just_br"]
            content = content.replace(/\n\s*\n/g, "\n")
        }

        const formatMetadata = () => {
            const metadataItems = [
              { label: "Type of OED", value: type_of_oed },
              { label: "Title", value: title },
              { label: "Course", value: course_title_with_spaces },
              { label: "Course ID", value: course_id },
              { label: "Course run", value: course_run },
              { label: "Chapter title", value: chapter_title },
              { label: "Chapter number", value: chapter_order_in_course },
              { label: "Sequential title", value: sequential_title },
              { label: "Sequential number", value: sequential_order_in_chapter },
              { label: "Vertical title", value: vertical_title },
              { label: "Vertical number", value: vertical_order_in_sequential },
            ];
          
            const metadataHtml = metadataItems
              .map(
                (item) => `
                  <div class="border-t border-gray-200">
                    <dl>
                      <div class="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt class="text-sm font-medium text-gray-500">${item.label}</dt>
                        <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">${item.value}</dd>
                      </div>
                    </dl>
                  </div>
                `
              )
              .join("");
          
            return `
              <div class="bg-white max-w-2xl shadow overflow-hidden sm:rounded-lg">
                <div class="px-4 py-3 sm:px-6">
                  <h3 class="text-lg leading-6 font-medium text-gray-900">${metadata_panel_title}</h3>
                </div>
                ${metadataHtml}
              </div>
            `;
          };
          
          const formatContent = () => `
            <div class="bg-white max-w-2xl shadow overflow-hidden sm:rounded-lg">
              <div class="px-4 py-3 sm:px-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900">${content_panel_title}</h3>
              </div>
              <div class="bg-white font-medium text-gray-500 shadow overflow-hidden sm:rounded-lg">
                <div class="px-4 py-3 sm:px-6">
                  <p class="font-medium text-gray-900">${content}</p>
                </div>
              </div>
            </div>
          `;
          
          const updatePage = () => {
            $("#metadata").html(formatMetadata());
            $("#transcript_or_quiz").html(formatContent());
          };
          
          updatePage();

        }
    })
    }

    function expand_tree_node(filename) {
    var endpoints = document.getElementsByClassName("endpoint")

    for (i = 0; i < endpoints.length; i++) {
        if (endpoints[i].id == filename) {
        break
        }
    }
    }

    function hightlight_point(course_title, filename) {
    var scatter_plot = document.getElementById("chart")
    result = scatter_plot
    let found = false
    for (let i = 0; i < result.data.length; i++) {
        if (result.data[i].uid == filename + ".xml") {
        current_idx_marker = i
        current_idx_marker_name = result.data[i].name
        current_idx_marker_course_name = result.data[i].meta
        found = true
        break
        }
    }
    new_trace = result.data[current_idx_marker]

    update_first = {
    marker: {
        size: 32,
        color: new_trace.marker.color,
        symbol: new_trace.marker.symbol
    }
    }


    if (course_title != "All Courses") {
    Plotly.restyle("chart", update_first, {}, current_idx_marker)
    }
    if (prev_idx_marker != -1) {
    old_trace = result.data[prev_idx_marker]

    update_prev = {
        marker: {
        size: 12,
        color: old_trace.marker.color,
        symbol: old_trace.marker.symbol
        }
    }
    if (course_title != "All Courses") {
        Plotly.restyle("chart", update_prev, {}, prev_idx_marker)
    }
    }
    prev_idx_marker = current_idx_marker
    prev_idx_marker_name = current_idx_marker_name

    if (course_title == "All Courses") {
    course_title = current_idx_marker_course_name
    update_tree(course_title, filename)
    }

    if (course_title != "All Courses") {
    update_tree(course_title, filename)
    }
}
function process_course(course_elems) {
    result_html = "<ul class='tree' id='tree-view'>"
  }

  function process_chapter(course_elems) {
    max_len_display_name_chapter = 32
    display_name_short = course_elems[idx]["display_name"].substring(0, max_len_display_name_chapter)
    if (display_name.length > max_len_display_name_chapter) {
      display_name_short += "..."
    }

    result_html = result_html + "<li class='parent'><details><summary>Ch: " + display_name_short + "</summary><ul>"
  }

  function process_sequential(course_elems) {
    let max_len_display_name_sequential = 30    
    display_name_short = course_elems[idx]["display_name"].substring(0, max_len_display_name_sequential)
    if (display_name.length > max_len_display_name_sequential) {
      display_name_short += "..."
    }
    result_html = result_html + "<li class='parent'><details><summary>Seq: " + display_name_short + "</summary><ul>"
  }

  function process_vertical(course_elems) {
    let max_len_display_name_vertical = 27
    display_name_short = course_elems[idx]["display_name"].substring(0, max_len_display_name_vertical)
    if (display_name.length > max_len_display_name_vertical) {
      display_name_short += "..."
    }
    result_html = result_html + "<li class='parent'><details><summary>Vert: " + display_name_short + "</summary><ul>"

    if (idx + 1 == course_elems.length) {
      result_html = result_html + "</ul></details></li></ul></details></li></ul></details></li></ul>"
    } else {
      try {
        node_type = course_elems[idx + 1]["type"]
        display_name = course_elems[idx + 1]["display_name"]
      } catch (err) {
        node_type = ""
        display_name = ""
        console.log("!!! Error 2 parsing elem: idx+1=" + idx + 1 + "display name: " + display_name + " course_elems[idx+a]" + course_elems[idx + 1] + " course_elems.length=" + course_elems.length)
      }
      if (node_type == "vertical") {
        result_html = result_html + "</ul></details></li>"
      } else if (node_type == "sequential") {
        result_html = result_html + "</ul></details></li></ul></details></li>"
      } else if (node_type == "chapter") {
        result_html = result_html + "</ul></details></li></ul></details></li></ul></details></li>"
      }
    }
  }

  function process_endpoint(course_elems) {
    let max_len_display_name_end_node = 23    
    if (course_elems[idx]["type"] == "video") {
      video_xml = course_elems[idx]["filename"]
      type = course_elems[idx]["type"]
      display_name = course_elems[idx]["display_name"]
      display_name_short = course_elems[idx]["display_name"].substring(0, max_len_display_name_end_node)
      course_title_marker = course_elems[idx]["course_title"]
      if (display_name.length > max_len_display_name_end_node) {
        display_name_short += "..."
      }
      result_html = result_html + '<li class="endpoint" id="' + video_xml + '"><a href="#" onclick="hightlight_point(\'' + course_title_marker + "', '" + video_xml + "')\"> video: " + display_name_short + "</a></li>"
    } else if (course_elems[idx]["type"] == "problem") {
      problem_xml = course_elems[idx]["filename"]
      type = course_elems[idx]["type"]
      display_name = course_elems[idx]["display_name"]
      display_name_short = course_elems[idx]["display_name"].substring(0, max_len_display_name_end_node)
      course_title_marker = course_elems[idx]["course_title"]
      if (display_name.length > max_len_display_name_end_node) {
        display_name_short += "..."
      }

      result_html = result_html + '<li class="endpoint" id="' + problem_xml + '"><a href="#" onclick="hightlight_point(\'' + course_title_marker + "', '" + problem_xml + "')\"> quiz: " + display_name_short + "</a></li>"
    } else if (course_elems[idx]["type"] == "html") {
      video_xml = course_elems[idx]["filename"]
      type = course_elems[idx]["type"]
      display_name = course_elems[idx]["display_name"]
      display_name_short = course_elems[idx]["display_name"].substring(0, max_len_display_name_end_node)
      if (display_name.length > max_len_display_name_end_node) {
        display_name_short += "..."
      }
      result_html = result_html + "<li><a> html: " + display_name_short + "</a></li>"
    } else {
      result_html = result_html + "<li><a> discussion </a></li>"
    }
    if (idx + 1 == course_elems.length) {
      // last element -> we close
      result_html = result_html + "</ul></details></li></ul></details></li></ul></details></li></ul>"
    } else {
      try {
        node_type = course_elems[idx + 1]["type"]
        display_name = course_elems[idx + 1]["display_name"]
      } catch (err) {
        node_type = ""
        display_name = ""
        console.log("!!! Error 2 parsing elem: idx+1=" + idx + 1 + "display name: " + display_name + " course_elems[idx+a]" + course_elems[idx + 1] + " course_elems.length=" + course_elems.length)
      }
      if (node_type == "vertical") {
        result_html = result_html + "</ul></details></li>"
      } else if (node_type == "sequential") {
        result_html = result_html + "</ul></details></li></ul></details></li>"
      } else if (node_type == "chapter") {
        result_html = result_html + "</ul></details></li></ul></details></li></ul></details></li>"
      }
    }
  }

  function process_all(course_elems) {
    while (idx + 1 < course_elems.length) {
      idx += 1
      try {
        node_type = course_elems[idx]["type"]
        display_name = course_elems[idx]["display_name"]
      } catch (err) {
        node_type = ""
        display_name = ""
        console.log("!!! Error 1 parsing elem: idx+1=" + idx + 1 + "display name: " + display_name + " course_elems[idx+a]" + course_elems[idx + 1] + " course_elems.length=" + course_elems.length)
        return
      }

      if (node_type == "course") {
        process_course(course_elems)
      } else if (node_type == "chapter") {
        process_chapter(course_elems)
      } else if (node_type == "sequential") {
        process_sequential(course_elems)
      } else if (node_type == "vertical") {
        process_vertical(course_elems)
      } else if (node_type == "") {
      } else {
        process_endpoint(course_elems)
      }
    }
  }

  function cb(selection, newPlot) {
    $.getJSON({
      url: subdomain + "/callback",
      mode: 'cors',
      data: { data: selection },
      success: function (result) {
        result.config = { displayModeBar: false }
        if (newPlot == true) {
          prev_idx_marker = -1
          current_idx_marker = -1
          current_idx_marker_name = ""
          prev_idx_marker_name = ""
        }
        Plotly.react("chart", result)
        if (all_courses_loaded == false) {
          $.getJSON({
            url: subdomain + "/callback_load_all_courses",
            mode: 'cors',
            data: { data: selection },
            success: function (result) {
              console.log("callback_load_all_courses end!")
            }
          })
        }
      }
    })

    $.getJSON({
      url: subdomain + "/callback_structure",
      mode: 'cors',
      data: { data: selection },
      success: function (course_elems) {
        $("#course_structure").empty()
        $("#course_structure").innerHTML = ""
        let video_xml = ""
        result_html = ""
        idx = -1
        course_title = course_elems[0]["display_name"]

        if (course_title != "All Courses") {
          process_all(course_elems)
        }
        $("#course_structure").append(result_html)
      }
    })

    // we clear the Metadata and Content fields
    clear_metadata_content_fields()
  }

  function turn_autozoom_on(){
    Plotly.relayout("chart", 'xaxis.autorange', "True")
    Plotly.relayout("chart", 'yaxis.autorange', "True")
  }

  function turn_autozoom_off(){
    Plotly.relayout("chart", 'xaxis.autorange', "False")
    Plotly.relayout("chart", 'yaxis.autorange', "False")
  }

  function stringify(obj) {
    let cache = [];
    let str = JSON.stringify(obj, function(key, value) {
      if (typeof value === "object" && value !== null) {
        if (cache.indexOf(value) !== -1) {
          // Circular reference found, discard key
          return;
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    });
    cache = null; // reset the cache
    return str;
  }
