from flask import Flask, render_template, request
from flask_wtf import CSRFProtect
from flask_cors import CORS, cross_origin
import pandas as pd
import json
import plotly
import plotly.graph_objects as go
import os
import jsonpickle

from utils import (
    read_json_all_course_structures,
    load_course_structure,
    get_transcript_or_quiz_and_metadata,
    load_toml_config_file,
)

plotly.io.json.config.default_engine = "orjson"

toml_config = load_toml_config_file(config_file_path="config.toml")
if toml_config is None:
    print("Error: could not load TOML config file")
    exit()


app = Flask(__name__)
CORS(app)
app.config.from_object("config")

csrf = CSRFProtect(app)

content_path = os.path.join(app.root_path, "static", "content")
csv_path = os.path.join(
    content_path,
    toml_config["general"]["model_folder"],
    toml_config["general"]["umap_embeddings_filename"],
)

df = None
fig = None
fig_all_courses = None
graphJSON_all_courses = None
all_courses_loaded = False
all_courses_structures = {}


@app.before_first_request
def my_func():
    global \
        df, \
        fig, \
        fig_all_courses, \
        graphJSON_all_courses, \
        all_courses_loaded, \
        all_courses_structures
    fig = go.Figure()
    fig_all_courses = go.Figure()
    df = pd.read_csv(csv_path)
    all_courses_structures = read_json_all_course_structures(
        content_path=content_path,
        all_olx_courses_json_filename=toml_config["general"][
            "all_olx_courses_json_filename"
        ],
    )
    all_courses_loaded = False


@app.route("/callback", methods=["POST", "GET"])
@cross_origin()
def cb():
    return gm(request.args.get("data"))


@app.route("/callback_structure", methods=["POST", "GET"])
@cross_origin()
def cb_structure():
    course_name = request.args.get("data")
    if course_name != "All Courses":
        return load_course_structure(
            course_name=request.args.get("data"),
            all_courses_structures=all_courses_structures,
        )
    else:
        course_elems = []
        course_elems.append(
            {
                "type": "",
                "display_name": course_name,
                "filename": "",
                "course_title": course_name,
            }
        )
        return jsonpickle.encode(course_elems)


@app.route("/callback_highlight_point", methods=["POST", "GET"])
@cross_origin()
def cb_highlight_point():
    course_title = request.args.get("course_title")
    filename = request.args.get("filename")
    return gm(course_title=course_title, filename=filename)


@app.route("/")
@cross_origin()
def index():
    countries_initial_list = df["course_title"].tolist()
    countries_initial_list.append("All Courses")
    countries_set = set(countries_initial_list)
    courses_list = list(countries_set)
    courses_list.sort()

    course_elems = load_course_structure(
        course_name=courses_list[0], all_courses_structures=all_courses_structures
    )
    return render_template(
        "index.html",
        courses=courses_list,
        course_elems=course_elems,
        graphJSON=gm(courses_list[0]),
    )


@app.route("/callback_load_all_courses", methods=["POST", "GET"])
@cross_origin()
def load_all_courses():
    global df, fig, fig_all_courses, graphJSON_all_courses, all_courses_loaded

    if not all_courses_loaded:
        all_colors = toml_config["general"]["all_colors"]
        counter = 0
        legend_group_list = []
        curr_legend_group_list = []
        legend_group_colors = dict()
        course_title_max_len = "All Courses"

        df_course = df.sort_values(by="course_title", ascending=True)
        for idx, row in df_course.iterrows():
            type_name = "videos" if row["type"] == 1 else "quizzes"
            groupe_title = row["course_title_max_len"]
            if groupe_title not in legend_group_list:
                legend_group_list.append(groupe_title)
                legend_group_colors[groupe_title] = all_colors[
                    counter % len(all_colors)
                ]
                counter += 1

            if row["type"] == 1:
                shape = "circle"
            else:
                shape = "circle-open"
            type_name = "videos" if row["type"] == 1 else "quizzes"
            groupe_title_full = row["course_title_max_len"] + " - " + type_name
            current_color = legend_group_colors[row["course_title_max_len"]]
            if groupe_title_full not in curr_legend_group_list:
                curr_legend_group_list.append(groupe_title_full)
                showlegend_val = True
            else:
                showlegend_val = False

            course_title_marker = row["course_exported_folder_name"]

            fig_all_courses.add_trace(
                go.Scattergl(
                    x=[row["umap_x_cosine"]],
                    y=[row["umap_y_cosine"]],
                    uid=row["filename"],
                    meta=course_title_marker,
                    mode="markers",
                    hovertemplate=f"<b>{groupe_title_full}</b><br>title: {row['title']}<br>filename: {row['filename']}<br>x: {row['umap_x_cosine']}<br>y: {row['umap_y_cosine']}<br>course: {row['course_title_max_len']} <br>chapter: {row['chapter_title_max_len']}<extra></extra>",
                    showlegend=showlegend_val,
                    name=groupe_title_full,
                    marker={
                        "size": toml_config["general"]["marker_size"],
                        "symbol": shape,
                        "opacity": toml_config["general"]["marker_opacity"],
                        "color": current_color,
                    },
                    legendgroup=groupe_title_full,
                )
            )

        fig_all_courses.update_layout(
            legend_title_text=course_title_max_len,
            xaxis_title="UMAP (x)",
            yaxis_title="UMAP (y)",
            height=toml_config["general"]["fig_height"],
            margin=dict(
                l=toml_config["general"]["fig_margin_left"],
                r=toml_config["general"]["fig_margin_right"],
                b=toml_config["general"]["fig_margin_bottom"],
                t=toml_config["general"]["fig_margin_top"],
                pad=toml_config["general"]["fig_pad"],
            ),
        )

        fig_all_courses.update_xaxes(
            range=[
                toml_config["general"]["fig_all_courses_xaxes_start"],
                toml_config["general"]["fig_all_courses_xaxes_end"],
            ]
        )
        fig_all_courses.update_yaxes(
            range=[
                toml_config["general"]["fig_all_courses_yaxes_start"],
                toml_config["general"]["fig_all_courses_yaxes_end"],
            ]
        )

        graphJSON_all_courses = json.dumps(
            fig_all_courses, cls=plotly.utils.PlotlyJSONEncoder
        )
        all_courses_loaded = True

    return json.dumps(graphJSON_all_courses)


def gm(course_title, filename=None):
    # we reset the figure
    fig.data = []
    fig.layout = {}

    if course_title != "All Courses":
        df_course = df.loc[df["course_title"] == course_title].sort_values(
            by="chapter_title", ascending=True
        )

    text_max_len_title = toml_config["general"]["text_max_len_title"]

    if course_title != "All Courses":
        legend_group_list = []
        curr_legend_group_list = []
        legend_group_colors = dict()
        course_title_max_len = course_title[0:text_max_len_title]
        if len(course_title) > text_max_len_title:
            course_title_max_len += "..."

        all_colors = toml_config["general"]["all_colors"]
        counter = 0
        for idx, row in df_course.iterrows():
            type_name = "videos" if row["type"] == 1 else "quizzes"
            groupe_title = row["chapter_title_max_len"]
            if groupe_title not in legend_group_list:
                legend_group_list.append(groupe_title)
                legend_group_colors[groupe_title] = all_colors[
                    counter % len(all_colors)
                ]
                counter += 1

        uids = []
        for idx, row in df_course.iterrows():
            if row["type"] == 1:
                shape = "circle"
            else:
                shape = "circle-open"
            uids.append(row["filename"])
            type_name = "videos" if row["type"] == 1 else "quizzes"
            groupe_title = row["chapter_title_max_len"] + " - " + type_name
            current_color = legend_group_colors[row["chapter_title_max_len"]]

            if groupe_title not in curr_legend_group_list:
                curr_legend_group_list.append(groupe_title)
                showlegend_val = True
            else:
                showlegend_val = False
            course_title_marker = row["course_exported_folder_name"]

            fig.add_trace(
                go.Scattergl(
                    x=[row["umap_x_cosine"]],
                    y=[row["umap_y_cosine"]],
                    uid=row["filename"],
                    mode="markers",
                    hovertemplate=f"<b>{groupe_title}</b><br>title: {row['title']}<br>filename: {row['filename']}<br>x: {row['umap_x_cosine']}<br>y: {row['umap_y_cosine']}<br>course: {row['course_title_max_len']} <br>chapter: {row['chapter_title_max_len']}<extra></extra>",
                    meta=course_title_marker,
                    showlegend=showlegend_val,
                    name=groupe_title,
                    marker={
                        "size": toml_config["general"]["marker_size"],
                        "symbol": shape,
                        "opacity": toml_config["general"]["marker_opacity"],
                        "color": current_color,
                    },
                    legendgroup=groupe_title,
                )
            )

        fig.update_layout(
            legend_title_text=course_title_max_len,
            xaxis_title="UMAP (x)",
            yaxis_title="UMAP (y)",
            height=toml_config["general"]["fig_height"],
            margin=dict(
                l=toml_config["general"]["fig_margin_left"],
                r=toml_config["general"]["fig_margin_right"],
                b=toml_config["general"]["fig_margin_bottom"],
                t=toml_config["general"]["fig_margin_top"],
                pad=toml_config["general"]["fig_pad"],
            ),
        )

    if course_title == "All Courses":
        return graphJSON_all_courses

    else:
        graphJSON = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
    return graphJSON


@app.route("/callback_transcript_or_quiz_and_metadata", methods=["POST", "GET"])
@cross_origin()
def cb_transcript_or_quiz_and_metadata():
    course_title = request.args.get("course_title")
    filename = request.args.get("filename")
    return get_transcript_or_quiz_and_metadata(
        course_name=course_title,
        filename=filename,
        content_path=content_path,
        model_folder=toml_config["general"]["model_folder"],
    )


if __name__ == "__main__":
    app.run(
        host=toml_config["general"]["hostname"],
        port=toml_config["general"]["port"],
    )
