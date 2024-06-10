from typing import Dict, Union
import os
import json
import jsonpickle
import toml


def clean_course_name(course_display_name):
    # we remove spaces from the course name
    course_display_name = course_display_name.replace(" ", "-")
    course_display_name = course_display_name.replace("/", "-")
    course_display_name = course_display_name.replace(":", "-")
    course_display_name = course_display_name.replace("!", "-")
    course_display_name = course_display_name.replace("(", "-")
    course_display_name = course_display_name.replace(")", "-")
    course_display_name = course_display_name.replace(",", "-")
    course_display_name = course_display_name.replace(";", "-")
    course_display_name = course_display_name.replace("'", "-")
    course_display_name = course_display_name.replace("...", "-")
    course_display_name = course_display_name.replace("----", "-")
    course_display_name = course_display_name.replace("---", "-")
    course_display_name = course_display_name.replace("-–-", "-")
    course_display_name = course_display_name.replace("--", "-")
    course_display_name = course_display_name.replace("…-", "-")
    course_display_name = course_display_name.replace("ffff", "f")
    course_display_name = course_display_name.replace("’", "")
    if course_display_name.endswith("-"):
        course_display_name = course_display_name[:-1]
    course_display_name = course_display_name.lower()

    return course_display_name


def read_json_all_course_structures(
    content_path: str, all_olx_courses_json_filename: str
):
    all_courses_elems = {}

    json_path = os.path.join(content_path, all_olx_courses_json_filename)

    with open(json_path) as json_file:
        all_courses_elems = json.load(json_file)
    return all_courses_elems


def load_course_structure(course_name: str, all_courses_structures: Dict):
    if course_name != "All Courses":
        course_name_no_w_space = clean_course_name(course_name)

        course_elems = all_courses_structures[course_name_no_w_space]

        return jsonpickle.encode(course_elems)  # new

    else:
        course_elems = []
        course_elems.append(
            {
                "type": "",
                "display_name": course_name,
                "filename": "",
                "course_title": course_name_no_w_space,
            }
        )
        return jsonpickle.encode(course_elems)


def get_transcript_or_quiz_and_metadata(
    course_name, filename, content_path, model_folder
):
    course_name = clean_course_name(course_name)

    found = False
    language_codes = ["en", "fr", "it", "de"]
    for lang_code in language_codes:
        try:
            json_file_path = os.path.join(
                content_path,
                model_folder,
                course_name,
                filename + "-" + lang_code + ".json",
            )

            with open(json_file_path) as json_file:
                data = json.load(json_file)
        except FileNotFoundError:
            continue
        else:
            found = True
            break

    if not found:
        json_file_path = os.path.join(
            content_path, model_folder, course_name, filename + ".json"
        )

        with open(json_file_path) as json_file:
            data = json.load(json_file)

    elem_type = data["context"]["type"]

    if elem_type == 1:  # video
        language_code = data["context"]["language_code"]
        transcript_text_file_path = os.path.join(
            content_path,
            model_folder,
            course_name,
            filename + "-" + language_code + ".txt",
        )
        transcript_text_file = open(transcript_text_file_path, "r")
        transcript_all_text = transcript_text_file.read()
        transcript_text_file.close()
        data["context"]["transcript_all_text"] = transcript_all_text

    return jsonpickle.encode(data)


def load_toml_config_file(config_file_path: str) -> Union[Dict, None]:
    """
    Loads the TOML configuration file.

    Parameters:
    config_file_path (str): The path to the TOML configuration file.

    Returns:
    Union[Dict, None]: The loaded configuration as a dictionary, or None if an exception occurs.
    """
    try:
        site_root = os.path.realpath(os.path.dirname(__file__))

        full_config_file_path = os.path.join(site_root, config_file_path)
        with open(full_config_file_path, "r") as toml_file:
            config = toml.load(toml_file)

        return config

    except Exception as e:
        print(f"Exception loading configuration file: {e}")
        return None
