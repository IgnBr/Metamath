import os
import asyncio
import js
import sys
import json
from pyparsing import Literal, SkipTo, ParserElement, StringEnd, Optional, ZeroOrMore, Group
from js import document, FileReader, setTimeout
from pyodide.ffi import create_proxy, create_once_callable
import io
from pyodide.http import pyfetch

data = None

def handleFileSelect():
    file_event = create_proxy(process_file)
    e = document.getElementById("input")
    e.addEventListener("change", file_event, False)

def process_file(event):
    file_list = document.getElementById("input").files
    for f in file_list:
        filename = f.name
        reader = FileReader.new()
        onload_event = create_proxy(read_complete)
        reader.onload = onload_event
        reader.readAsText(f)
        
def getSectionComments(section):
    comments = []
    nonComments = ""
    lCommentmarker = Literal('$(')("commentStart")
    rCommentmarker = Literal('$)')("commentEnd")
    commentText =SkipTo(rCommentmarker)("comment")
    commentPattern = SkipTo(lCommentmarker | StringEnd())("nonComment") + Optional(lCommentmarker)  + Optional(commentText) + Optional(rCommentmarker)

    for tokens, start, end in commentPattern.scanString(section):
        if tokens.comment:
            startIdx = tokens.comment.rfind('~~~comment')
            endIdx = tokens.comment.rfind('}')
            if startIdx >=0 and endIdx >=0:
                args = json.loads(tokens.comment[startIdx+10:endIdx+1])
                commentText = tokens.comment[endIdx+1:]
                comments.append((args["ref"], tokens.comment[endIdx+1:]))
        if tokens.nonComment is not None:
            nonCommentStr = tokens.nonComment.strip()
            if nonCommentStr:
                nonComments += tokens.nonComment + '\n'
    return comments, nonComments
    

async def read_complete(event):
    metamath_file = event.target.result
    if document.querySelector('#api-toggle').checked:
        try:
            url = "http://localhost:5000/metamath"
            headers = {"Content-Type": "text/plain; charset=utf-8"}
            response =  await pyfetch(url=url,headers=headers,body=metamath_file, method="POST")
            response = await response.json()
            if response.get('error') is not None:
                error = response.get('error')
                createErrorDiv(error)
                raise Exception(error)
            else:
                about = response.get('about')
                text_div = Element("text-content")
                if about.get('description') is not None or len(about.get('contributors')) > 0:
                    text_div.element.innerHTML = '<pre>' + response.get('nonComments') + '</pre>' +'<button id="about">About</button>'
                else:
                    text_div.element.innerHTML = '<pre>' + response.get('nonComments') + '</pre>' 
                    
                fixTitleLayout()
                js.treeJSON(json.dumps(about),response.get('data'), json.dumps(response.get('proofsStacks')))
        except Exception as e:
            createErrorDiv(str(e))
            raise
            
    else:
        try:
            mm = MM(None, None)
            mm.read(Toks(io.StringIO(metamath_file)))
        except Exception as e:
            createErrorDiv(str(e))
            raise
        
        lmarker = Literal('$( ~~~section')("sectionStart")
        args = SkipTo(' $)')("args")
        rmarker = Literal('$( section~~~ $)')("sectionEnd")
        lmarkerend = Literal('$)')("sectionStartEnd")
        text = SkipTo(rmarker)("content")


        pattern = SkipTo(lmarker) + lmarker + args + lmarkerend + text + rmarker

        data = []
        nonComments = ""
        allComments = []
        for tokens, start, end in pattern.scanString(metamath_file):
            args = json.loads(tokens.args)
            comments, metamathSyntax = getSectionComments(tokens.content)
            data.append((comments, args, metamathSyntax))
            allComments += comments
            if nonComments == "":
                nonComments += "$( SECTION " + args["name"] + " $)\n" + metamathSyntax
            else:
                nonComments += "\n$( SECTION " + args["name"] + " $)\n" + metamathSyntax
        
        
        text_div = Element("text-content")
        title,description,contributors = parseAboutPage(metamath_file)
        if description is not None or len(contributors) > 0:
            text_div.element.innerHTML = '<pre>' + nonComments + '</pre>' +'<button id="about">About</button>'
        else:
            text_div.element.innerHTML = '<pre>' + nonComments + '</pre>' 
        
        treeData = parseFile(metamath_file, allComments, data)
        fixTitleLayout()
        js.treeJSON(json.dumps({"title":title,"description":description, "contributors":contributors }), treeData, json.dumps(proofsStacks))

handleFileSelect()

def fixTitleLayout():
    title_div = document.querySelector('#main-selection')
    title_div.style.position = "relative"
    title_div.style.top = '0'
    title_div.style.left = '0'
    title_div.style.display = 'inline'
    title_div.style.transform = 'null'
    example_div = document.querySelector('#example')
    if example_div:
        example_div.remove()

def parseAboutPage(metamath):
    lTitleMarker = Literal('$( ~~~title')
    title = SkipTo(' $)')("title")
    rTitleMarker = Literal('$)')

    lDescriptionMarker = Literal('$( ~~~description')
    description = SkipTo('$)')("description")
    rDescriptionMarker = Literal('$)')

    lContributorMarker = Literal('$( ~~~contributor')
    contributor = SkipTo('$)')
    rContributorMarker = Literal('$)')

    pattern = (Optional(lTitleMarker + title + rTitleMarker)
            + Optional(lDescriptionMarker + description + rDescriptionMarker)
            + ZeroOrMore(lContributorMarker + contributor + rContributorMarker)("contributor"))

    try:
        parsed_data = pattern.parseString(metamath)
        title = parsed_data.title
        description = parsed_data.description
        contributors = parsed_data.contributor[1::3]
        return title,description,contributors
    except Exception as e:
        createErrorDiv(e)
        print("Error: ", e)

def createErrorDiv(message):
    error_div = document.createElement('div')
    error_div.textContent = message
    error_div.style.backgroundColor = 'red'
    error_div.style.color = 'white'
    error_div.style.padding = '10px'
    error_div.style.position = 'fixed'
    error_div.style.bottom = '0'
    error_div.style.left = '0'
    error_div.style.setProperty("border-radius", "10px")
    error_div.style.setProperty("max-width", "50%")
    document.body.appendChild(error_div)
    def fade_out():
        error_div.style.opacity = '0'  
        error_div.style.transition = 'opacity 3s ease-out'
        remove_div = create_proxy(lambda: error_div.remove())
        remove_div_callable = create_once_callable(remove_div)
        setTimeout(remove_div_callable, 3000)
    fade_out_callable = create_once_callable(fade_out)
    setTimeout(fade_out_callable, 3000)