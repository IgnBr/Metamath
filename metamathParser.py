import re
import json

def parseFile(data, comments, sections):
    mmWithoutComments = re.sub(r'\$\((.|\r\n|\r|\n)*?\$\)', '', data)
    mmWithoutComments = re.sub('\n+', '\n', mmWithoutComments)
    mmWithoutComments = mmWithoutComments.strip()

    constants = []
    variables = []
    disjointVariables = []
    floatingHypotheses = []
    essentialHypotheses = []
    axiomaticAssertions = []
    provableAssertions = []

    formattedLines = mmWithoutComments.splitlines(True)
    
    def categorizeLines(formattedLines):
        insideABlock = False
        blockText = ''
        for line in formattedLines:
            targetArray = None
            if '${' not in line and not insideABlock:
                if '$c' in line:
                    targetArray = constants
                elif '$v' in line:
                    targetArray = variables
                elif '$d' in line:
                    targetArray = disjointVariables
                elif '$f' in line:
                    targetArray = floatingHypotheses
                elif '$e' in line:
                    targetArray = essentialHypotheses
                elif '$a' in line:
                    targetArray = axiomaticAssertions
                elif '$p' in line:
                    targetArray = provableAssertions
                if targetArray is not None:
                    if '$.' not in line:
                        index = formattedLines.index(line) + 1
                        multipleLines = line
                        for x in range(index, len(formattedLines)):
                            if '$.' not in formattedLines[x]:
                                multipleLines+= formattedLines[x]
                            else:
                                multipleLines+= formattedLines[x]
                                targetArray.append(multipleLines)
                                break
                        continue
                    else:
                        targetArray.append(line)
            else:
                insideABlock = '$}' not in line
                line = line.strip()
                blockText +='\n'
                if '${' in line:
                    blockText += line.replace('${', '')
                else:
                    if insideABlock == False:
                        blockText += line.replace('$}', '') 
                    else:
                        blockText += line
        return blockText
                        
    blocks = categorizeLines(formattedLines)
    categorizeLines(blocks.splitlines(True))

    def argumentLineSplitByWhitespace(startIdentifier, initArray, array = [], endIdentifier = '$.' ):
        for line in initArray:
            startIdx = line.rfind(startIdentifier) + len(startIdentifier)
            endIdx = line.rfind(endIdentifier)
            lineWithoutIdentifiers = line[startIdx:endIdx]
            lineWithoutIdentifiers = lineWithoutIdentifiers.strip()
            array = array + lineWithoutIdentifiers.split()
        return array

    def getFloatingHypOrAxiomaticAssert(initArray, identifier):
        array = []
        for line in initArray:
            startIdx = line.rfind(identifier)
            endIdx = line.rfind('$.')
            argName = line[:startIdx]
            argValue = line[startIdx + 2:endIdx]
            array = array + [argName+argValue.strip()]
        return array
    
    def getProvableAssertion(initArray, identifier):
        array = []
        for line in initArray:
            startIdx = line.rfind(identifier)
            endIdx = line.rfind('$.')
            proofStartIdx = line.rfind('$=')
            argName = line[:startIdx]
            proof = line[proofStartIdx+2 : endIdx]
            argValue = line[startIdx + 2:proofStartIdx]
            proof = proof.strip()
            proof = proof.replace('\n',' ')
            proof = proof.replace('\r','')
            array = array + [(argName,argValue.strip(), proof.strip())]
        return array

    parsedConstants = argumentLineSplitByWhitespace('$c', constants)
    parsedVariables = argumentLineSplitByWhitespace('$v', variables)
    parsedFloatingHypotheses = getFloatingHypOrAxiomaticAssert(floatingHypotheses, '$f')
    parsedAxiomaticAssertions = getFloatingHypOrAxiomaticAssert(axiomaticAssertions, '$a')
    parsedProvableAssertions = getProvableAssertion(provableAssertions, '$p')

    def getJsonConstOrVar(val, group):
        array = []
        for idx, value in enumerate(val):
            array.append({ "id": f'{group}{idx}', "name": value, "group": group })
            
        return array

    def getJsonFloatingHypOrAxiomaticAssert(val, group):
        array = []
        for value in val:
            nameAndVal = value.split(" ", 1)
            if group == 'floatingHypothesis':
                floatingHypothesesNames.append(nameAndVal[0])
            array.append({ "id": nameAndVal[0], "name": nameAndVal[1], "group": group })
            
        return array

    floatingHypothesesNames = []
    getJsonConstOrVar(parsedConstants, 'constant')
    getJsonConstOrVar(parsedVariables, 'variable')
    getJsonFloatingHypOrAxiomaticAssert(parsedFloatingHypotheses, 'floatingHypothesis')
    getJsonFloatingHypOrAxiomaticAssert(parsedAxiomaticAssertions, 'axiomaticAssertion')


    def getAssertionSection(name, isProvable):
        for comments, args, metamathSyntax in sections:
            if isProvable:
                if name+ " $p" in metamathSyntax:
                    return args["name"]
            else:
                if name+ " $a" in metamathSyntax:
                    return args["name"]
                

    def findAxiomaticAssertionEdges(findFrom, constants, variables, group, floatingHypotheses):
        parents = []
        for line in findFrom:
            children = []
            [id, values] = line.split(" ", 1)
            if '|-' in values:
                idx = constants.index('|-') if '|-' in constants else None
                if idx is not None:
                    if {"name": constants[idx], "group": "constants"} not in children:
                        children += [{"name": constants[idx], "value": ["$c "+constants[idx]+ " $."],"group": "constants"}]
            valueArray = values.split()
            for value in valueArray:
                idx = floatingHypotheses.index(value) if value in floatingHypotheses else None
                if idx is not None:
                    if {"name": floatingHypotheses[idx][0], "value": [floatingHypotheses[idx][0]+" $f "+floatingHypotheses[idx][1]+ " $."], "group": "floatingHypotheses"} not in children:
                        children += [{"name": floatingHypotheses[idx][0], "value": [floatingHypotheses[idx][0]+" $f "+floatingHypotheses[idx][1]+ " $."], "group": "floatingHypotheses"}]
                        continue
                idx = constants.index(value) if value in constants else None
                if idx is not None:
                    if {"name": constants[idx],  "value": ["$c "+constants[idx]+ " $."], "group": "constants"} not in children:
                        children += [{"name": constants[idx],  "value": ["$c "+constants[idx]+ " $."], "group": "constants"}]
                        continue
                idx = variables.index(value) if value in variables else None
                if idx is not None:
                    if {"name": variables[idx], "value": ["$v "+variables[idx]+ " $."], "group": "variables"} not in children:
                        children += [{"name": variables[idx], "value": ["$v "+variables[idx]+ " $."], "group": "variables"}]
                        continue
            parents += [{"name":id,"group":group, "value":[id+" $a "+values+ " $."], "children":children, "section":getAssertionSection(id.strip(), False)}]
        return parents
    
    def getFloatingHypothesisChildren(floatingHypothesis):
        children = []
        for value in floatingHypothesis:
            idx = parsedConstants.index(value) if value in parsedConstants else None
            if idx is not None:
                if {"name": parsedConstants[idx],  "value": ["$c "+parsedConstants[idx]+ " $."], "group": "constants"} not in children:
                    children += [{"name": parsedConstants[idx],  "value": ["$c "+parsedConstants[idx]+ " $."], "group": "constants"}]
                    continue
            idx = parsedVariables.index(value) if value in parsedVariables else None
            if idx is not None:
                if {"name": parsedVariables[idx], "value": ["$v "+parsedVariables[idx]+ " $."], "group": "variables"} not in children:
                    children += [{"name": parsedVariables[idx], "value": ["$v "+parsedVariables[idx]+ " $."], "group": "variables"}]
                    continue
        return children
    
    def findProvableAssertionEdges(findFrom, group, floatingHypotheses, axiomatixAssertions, provableAssertions = []):
        parents = []
        for line in findFrom:
            children = []
            id, values, proofLine = line
            proofArray = proofLine.split(' ')
            for proof in proofArray:
                idx = floatingHypotheses.index(proof) if proof in floatingHypotheses else None
                if idx is not None:
                    hypothesisChildren = getFloatingHypothesisChildren(parsedFloatingHypotheses[idx].split()[1:])
                    if {"name": parsedFloatingHypotheses[idx].split(' ')[0], "value": [parsedFloatingHypotheses[idx].split(' ')[0]+" $f "+parsedFloatingHypotheses[idx].split(' ')[1]+ " $."], "group": "floatingHypotheses", "children": hypothesisChildren} not in children:
                        children += [{"name": parsedFloatingHypotheses[idx].split(' ')[0], "value": [parsedFloatingHypotheses[idx].split(' ')[0]+" $f "+parsedFloatingHypotheses[idx].split(' ')[1]+ " $."], "group": "floatingHypotheses", "children": hypothesisChildren}]
                        continue
                idx = axiomatixAssertions.index(proof) if proof in axiomatixAssertions else None
                if idx is not None:
                    if finalAxiomaticAssertions[idx] not in children:
                        children += [finalAxiomaticAssertions[idx]]
                        continue
                idx = provableAssertions.index(proof) if proof in provableAssertions else None
                if idx is not None:
                    if provableAssertionsWithoutOtherProvable[idx] not in children:
                        children += [provableAssertionsWithoutOtherProvable[idx]]
                        continue

            parents += [{"name":id.strip(),"group":group, "value":[id.strip()+" $p "+values+" $= "+ proofLine+" $."], "children":children, "section":getAssertionSection(id.strip(), True)}]

        return parents
    
    def getNames(finalAxiomaticAssertions): 
        names = []
        for i in finalAxiomaticAssertions:
            names.append(i["name"])
        return names
        
    finalAxiomaticAssertions = findAxiomaticAssertionEdges(parsedAxiomaticAssertions, parsedConstants, parsedVariables,"axiomaticAssertions", floatingHypothesesNames)
    axiomaticAssertionsNames = getNames(finalAxiomaticAssertions)
    provableAssertionsWithoutOtherProvable = findProvableAssertionEdges(parsedProvableAssertions, "provableAssertions", floatingHypothesesNames, axiomaticAssertionsNames)
    provableAssertionsNames = getNames(provableAssertionsWithoutOtherProvable)
    finalProvableAssertions = findProvableAssertionEdges(parsedProvableAssertions, "provableAssertions", floatingHypothesesNames,axiomaticAssertionsNames, provableAssertionsNames)
    
    tree = {"tree":{"name":"Assertions","children": [
           {"name":"AxiomaticAssertions", "children":finalAxiomaticAssertions},
         {"name":"ProvableAssertions", "children":finalProvableAssertions}
             ]}, "comments":comments}
             
    
        
    return json.dumps(tree)